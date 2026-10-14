"use server";

import { prisma } from "@/src/lib/prisma";
import { MOV_DEL_LOTE, resumenMovimientosLote } from "@/src/lib/stock-almacen";
import { getCostoPromedioBase } from "@/src/lib/report-cost";
import { getBoliviaTime } from "@/src/utils/date";
import { addDays, diaBD } from "@/src/utils/report-dates";

/** Días de ventas que se usan para saber a qué ritmo sale cada producto */
const DIAS_RITMO = 30;
/** Cuántos días de venta conviene tener cubiertos al reponer */
const DIAS_OBJETIVO = 15;
const DIAS_ALERTA_VENCIMIENTO = 30;

export type EstadoStock = "sin" | "bajo" | "ok";

export type LoteAlmacen = {
  numeroLote: string;
  vence: string | null; // YYYY-MM-DD
  diasParaVencer: number | null; // negativo = ya venció
  unidades: number; // lo que queda (almacén + estante)
  valor: number;
};

export type ProductoAlmacen = {
  id: number;
  nombre: string;
  categoria: string;
  unidadBase: string;
  almacen: number; // unidades base todavía en bodega
  estante: number; // unidades base ya extraídas y aún sin vender
  total: number;
  minimo: number;
  costoUnidad: number;
  valor: number; // total × costo
  ventaDiaria: number; // unidades base por día (últimos 30 días)
  cobertura: number | null; // días que alcanza el stock; null si no se vende
  estado: EstadoStock;
  /** Cuánto comprar para cubrir DIAS_OBJETIVO días (o llegar al mínimo) */
  reponer: number;
  parado: boolean; // hay stock y no se vendió nada en 30 días
  lotes: LoteAlmacen[];
};

export type AlmacenData = {
  hoy: string;
  diasRitmo: number;
  diasObjetivo: number;
  totales: {
    valor: number;
    valorAlmacen: number;
    valorEstante: number;
    productosConStock: number;
    sinStock: number;
    bajo: number;
    valorParado: number;
    valorPorVencer: number; // vence dentro de los próximos 30 días
    valorVencidoSinRetirar: number; // ya venció y sigue en el almacén / estante
  };
  productos: ProductoAlmacen[];
  categorias: Array<{ categoria: string; valor: number; productos: number }>;
  /** Valor de mercadería que vence en cada una de las próximas 8 semanas */
  vencimientosSemana: Array<{ etiqueta: string; desde: string; valor: number; lotes: number }>;
  vencidos: Array<{ producto: string; lote: string; vencio: string; unidades: number; valor: number; unidadBase: string }>;
};

/*
 * FÓRMULAS (solo para el autor, no se muestran en pantalla):
 *   almacén (por lote) = cantidad inicial − salidas al estante + ajustes del almacén
 *   estante (por lote) = salidas al estante − vendido + ajustes del estante
 *   total   = almacén + estante                       · valor = total × costo promedio ponderado por unidad base
 *   ventaDiaria = unidades vendidas en los últimos DIAS_RITMO (30) días ÷ 30      · cobertura (alcanza) = total ÷ ventaDiaria
 *   estado: total = 0 → "sin" · total < stockMínimo → "bajo" · si no → "ok"
 *   reponer (conviene comprar) = máx(stockMínimo, ventaDiaria × DIAS_OBJETIVO (15)) − total      (no sale del documento: el 15 es propio)
 *   parado = tiene stock y no vendió nada en 30 días
 *   días para vencer = fecha de vencimiento del lote − hoy (negativo = ya venció)
 */
export async function getWarehouseInventory(): Promise<{ success: boolean; data?: AlmacenData; error?: string }> {
  try {
    const hoy = getBoliviaTime().toISOString().slice(0, 10);
    const finHoy = new Date(`${hoy}T23:59:59.999Z`);
    const desdeRitmo = new Date(`${addDays(hoy, -(DIAS_RITMO - 1))}T00:00:00.000Z`);

    const [lotes, productosDB, ventasRitmo, costos] = await Promise.all([
      prisma.lote.findMany({
        where: { estado: 1 },
        select: {
          numeroLote: true,
          fechaVencimiento: true,
          cantidadInicialUnidadesBase: true,
          productoID: true,
          MovimientoAlmacen: { where: MOV_DEL_LOTE, select: { tipoMovimiento: true, cantidadUnidadesBase: true } },
          StockVenta: {
            select: {
              DetalleVenta: {
                where: { Venta: { estado: 1 } },
                select: { cantidadUnidadesBase: true },
              },
            },
          },
        },
      }),
      prisma.producto.findMany({
        where: { estado: 1 },
        select: {
          id: true,
          nombre: true,
          stockMinimo: true,
          Categoria: { select: { nombre: true } },
          UnidadMedida: { select: { abreviatura: true, nombre: true } },
        },
      }),
      prisma.detalleVenta.findMany({
        where: { Venta: { estado: 1, fechaVenta: { gte: desdeRitmo, lte: finHoy } } },
        select: { cantidadUnidadesBase: true, StockVenta: { select: { productoID: true } } },
      }),
      getCostoPromedioBase(finHoy),
    ]);

    const vendido30 = new Map<number, number>();

    for (const d of ventasRitmo) {
      const id = d.StockVenta.productoID;

      vendido30.set(id, (vendido30.get(id) ?? 0) + Number(d.cantidadUnidadesBase));
    }

    type Acc = { almacen: number; estante: number; lotes: LoteAlmacen[] };
    const porProducto = new Map<number, Acc>();
    const fechasLote: Array<{ productoID: number; lote: LoteAlmacen; unidadBase: string; valor: number }> = [];

    for (const l of lotes) {
      const inicial = Number(l.cantidadInicialUnidadesBase);
      const mov = resumenMovimientosLote(l.MovimientoAlmacen);
      const vendido = l.StockVenta.reduce(
        (s, sv) => s + sv.DetalleVenta.reduce((t, d) => t + Number(d.cantidadUnidadesBase), 0),
        0,
      );
      const almacen = Math.max(inicial - mov.salidas + mov.ajusteAlmacen, 0);
      const estante = Math.max(mov.salidas - vendido + mov.ajusteEstante, 0);

      if (almacen + estante <= 0.001) continue;

      const acc = porProducto.get(l.productoID) ?? { almacen: 0, estante: 0, lotes: [] };
      const costo = costos.get(l.productoID)?.costoUnidad ?? 0;
      const vence = l.fechaVencimiento ? diaBD(l.fechaVencimiento) : null;
      const dias = vence
        ? Math.round((new Date(`${vence}T00:00:00Z`).getTime() - new Date(`${hoy}T00:00:00Z`).getTime()) / 86400000)
        : null;
      const lote: LoteAlmacen = {
        numeroLote: l.numeroLote,
        vence,
        diasParaVencer: dias,
        unidades: almacen + estante,
        valor: (almacen + estante) * costo,
      };

      acc.almacen += almacen;
      acc.estante += estante;
      acc.lotes.push(lote);
      porProducto.set(l.productoID, acc);
      fechasLote.push({ productoID: l.productoID, lote, unidadBase: "", valor: lote.valor });
    }

    const productos: ProductoAlmacen[] = productosDB.map((p) => {
      const acc = porProducto.get(p.id) ?? { almacen: 0, estante: 0, lotes: [] };
      const total = acc.almacen + acc.estante;
      const costoUnidad = costos.get(p.id)?.costoUnidad ?? 0;
      const minimo = Number(p.stockMinimo);
      const ventaDiaria = (vendido30.get(p.id) ?? 0) / DIAS_RITMO;
      const cobertura = ventaDiaria > 0 ? total / ventaDiaria : null;
      const estado: EstadoStock = total <= 0.001 ? "sin" : total < minimo ? "bajo" : "ok";
      const objetivo = Math.max(minimo, ventaDiaria * DIAS_OBJETIVO);
      const reponer = Math.max(Math.ceil(objetivo - total), 0);

      return {
        id: p.id,
        nombre: p.nombre,
        categoria: p.Categoria.nombre,
        unidadBase: p.UnidadMedida.abreviatura || p.UnidadMedida.nombre,
        almacen: acc.almacen,
        estante: acc.estante,
        total,
        minimo,
        costoUnidad,
        valor: total * costoUnidad,
        ventaDiaria,
        cobertura,
        estado,
        reponer,
        parado: total > 0.001 && ventaDiaria === 0,
        lotes: acc.lotes.sort((a, b) => (a.vence ?? "9999").localeCompare(b.vence ?? "9999")),
      };
    });

    const conStock = productos.filter((p) => p.total > 0.001);
    const catMap = new Map<string, { valor: number; productos: number }>();

    for (const p of conStock) {
      const c = catMap.get(p.categoria) ?? { valor: 0, productos: 0 };

      c.valor += p.valor;
      c.productos += 1;
      catMap.set(p.categoria, c);
    }

    // Vencimientos por semana (próximas 8) y lo que ya venció sin retirarse
    const semanas = Array.from({ length: 8 }, (_, i) => {
      const desde = addDays(hoy, i * 7);

      return { etiqueta: i === 0 ? "Esta semana" : `Semana ${i + 1}`, desde, hasta: addDays(desde, 6), valor: 0, lotes: 0 };
    });
    const nombres = new Map(productosDB.map((p) => [p.id, p]));
    const vencidos: AlmacenData["vencidos"] = [];
    let valorPorVencer = 0;
    let valorVencidoSinRetirar = 0;

    for (const f of fechasLote) {
      const l = f.lote;

      if (!l.vence || l.diasParaVencer === null) continue;

      const prod = nombres.get(f.productoID);

      if (l.diasParaVencer < 0) {
        valorVencidoSinRetirar += l.valor;
        vencidos.push({
          producto: prod?.nombre ?? "",
          lote: l.numeroLote,
          vencio: l.vence,
          unidades: l.unidades,
          valor: l.valor,
          unidadBase: prod?.UnidadMedida.abreviatura ?? "",
        });
        continue;
      }

      if (l.diasParaVencer <= DIAS_ALERTA_VENCIMIENTO) valorPorVencer += l.valor;

      const sem = semanas.find((s) => l.vence! >= s.desde && l.vence! <= s.hasta);

      if (sem) {
        sem.valor += l.valor;
        sem.lotes += 1;
      }
    }

    return {
      success: true,
      data: {
        hoy,
        diasRitmo: DIAS_RITMO,
        diasObjetivo: DIAS_OBJETIVO,
        totales: {
          valor: productos.reduce((s, p) => s + p.valor, 0),
          valorAlmacen: productos.reduce((s, p) => s + p.almacen * p.costoUnidad, 0),
          valorEstante: productos.reduce((s, p) => s + p.estante * p.costoUnidad, 0),
          productosConStock: conStock.length,
          sinStock: productos.filter((p) => p.estado === "sin").length,
          bajo: productos.filter((p) => p.estado === "bajo").length,
          valorParado: productos.filter((p) => p.parado).reduce((s, p) => s + p.valor, 0),
          valorPorVencer,
          valorVencidoSinRetirar,
        },
        productos: productos.sort((a, b) => b.valor - a.valor),
        categorias: Array.from(catMap.entries())
          .map(([categoria, v]) => ({ categoria, ...v }))
          .sort((a, b) => b.valor - a.valor),
        vencimientosSemana: semanas.map(({ etiqueta, desde, valor, lotes: n }) => ({ etiqueta, desde, valor, lotes: n })),
        vencidos: vencidos.sort((a, b) => b.valor - a.valor),
      },
    };
  } catch (error) {
    console.error("Error en getWarehouseInventory:", error);

    return { success: false, error: "Error al calcular el inventario" };
  }
}
