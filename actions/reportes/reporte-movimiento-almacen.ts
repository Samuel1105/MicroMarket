"use server";

import { MOV_INGRESO_ANULADO } from "@/src/lib/anulaciones";
import { prisma } from "@/src/lib/prisma";
import { MOV_DEL_LOTE, resumenMovimientosLote } from "@/src/lib/stock-almacen";
import { getBoliviaTime } from "@/src/utils/date";
import { diaBD, diasEnRango, rangoAnterior, rangoReporte } from "@/src/utils/report-dates";

type Params = { startDate: string; endDate: string };

/** Un lote que lleva más de estos días en bodega sin pasar al estante se marca como "esperando" */
const DIAS_ESPERA = 15;

/** Máximo de líneas del registro que se mandan a la pantalla (si hay más, se avisa) */
const LIMITE_LINEAS = 4000;

export type TipoLinea = "entrada" | "traslado" | "venta" | "ajuste";

/** Una línea del registro de movimientos: qué se movió, cuánto, y quién lo hizo */
export type LineaMov = {
  id: string;
  /** Fecha y hora (hora de Bolivia guardada como UTC: se muestra con timeZone "UTC") */
  fecha: string;
  tipo: TipoLinea;
  /** Entrada de una compra que se anuló, o venta anulada: queda en el historial pero no cuenta */
  anulado: boolean;
  producto: string;
  categoria: string;
  lote: string | null;
  /** Unidades base. En los ajustes lleva signo (− baja, + alta) */
  cantidad: number;
  unidad: string;
  usuarioId: number;
  usuario: string;
  /** N.º de compra o de venta, o la ubicación del ajuste */
  referencia: string | null;
  /** Proveedor / cliente / motivo del ajuste / quién hizo la compra */
  detalle: string | null;
};

export type LoteEsperando = {
  producto: string;
  lote: string;
  ingreso: string; // YYYY-MM-DD
  dias: number;
  unidadesEnBodega: number;
  unidadBase: string;
  vence: string | null;
};

export type DescuadreProducto = {
  producto: string;
  unidadBase: string;
  esperado: number; // lo que debería haber en el estante según los movimientos
  real: number; // lo que dice el stock de venta
  diferencia: number;
};

export type MovimientoAlmacenData = {
  rango: { start: string; end: string; dias: number };
  /** Registro completo del período, de lo más reciente a lo más antiguo */
  lineas: LineaMov[];
  /** true si había más líneas que el límite y se recortaron las más antiguas */
  lineasRecortadas: boolean;
  /** Días promedio entre que el lote entra y su traslado al estante (traslados del período) */
  diasHastaEstante: number | null;
  diasHastaEstantePrev: number | null;
  esperando: LoteEsperando[];
  descuadre: DescuadreProducto[];
  productosRevisados: number;
};

/** Días promedio que tardan los lotes en pasar al estante en un período */
async function diasHastaEstante(start: Date, end: Date): Promise<number | null> {
  const movs = await prisma.movimientoAlmacen.findMany({
    where: { tipoMovimiento: 2, fechaRegistro: { gte: start, lte: end } },
    select: { fechaRegistro: true, Lote: { select: { fechaRegistro: true } } },
  });
  let suma = 0;
  let n = 0;

  for (const m of movs) {
    if (!m.fechaRegistro || !m.Lote?.fechaRegistro) continue;
    suma += Math.max((m.fechaRegistro.getTime() - m.Lote.fechaRegistro.getTime()) / 86400000, 0);
    n += 1;
  }

  return n ? suma / n : null;
}

export async function getWarehouseMovements({
  startDate,
  endDate,
}: Params): Promise<{ success: boolean; data?: MovimientoAlmacenData; error?: string }> {
  try {
    const actual = rangoReporte(startDate, endDate);
    const prev = rangoAnterior(startDate, endDate);
    const previo = rangoReporte(prev.start, prev.end);
    const hoy = getBoliviaTime().toISOString().slice(0, 10);

    const [movs, detalles, personas, lotes, stockActual, dias, diasPrev] = await Promise.all([
      prisma.movimientoAlmacen.findMany({
        where: {
          tipoMovimiento: { in: [1, 2, 3, 4, MOV_INGRESO_ANULADO] },
          fechaRegistro: { gte: actual.startDate, lte: actual.endDate },
        },
        select: {
          id: true,
          tipoMovimiento: true,
          cantidadUnidadesBase: true,
          referenciaID: true,
          tipoReferencia: true,
          observaciones: true,
          fechaRegistro: true,
          usuarioIdRegistro: true,
          Producto: {
            select: {
              nombre: true,
              Categoria: { select: { nombre: true } },
              UnidadMedida: { select: { abreviatura: true, nombre: true } },
            },
          },
          Lote: { select: { numeroLote: true } },
        },
      }),
      prisma.detalleVenta.findMany({
        where: { Venta: { fechaVenta: { gte: actual.startDate, lte: actual.endDate } } },
        select: {
          id: true,
          cantidadUnidadesBase: true,
          StockVenta: {
            select: {
              Lote: { select: { numeroLote: true } },
              Producto: {
                select: {
                  nombre: true,
                  Categoria: { select: { nombre: true } },
                  UnidadMedida: { select: { abreviatura: true, nombre: true } },
                },
              },
            },
          },
          Venta: {
            select: {
              numeroVenta: true,
              fechaVenta: true,
              estado: true,
              usuarioRegistro: true,
              Cliente: { select: { nombre: true } },
            },
          },
        },
      }),
      prisma.persona.findMany({ select: { id: true, primerNombre: true, apellidoPaterno: true } }),
      // Todos los lotes: sirven para "lotes esperando" y para el cuadre
      prisma.lote.findMany({
        where: { estado: 1 },
        select: {
          numeroLote: true,
          fechaRegistro: true,
          fechaVencimiento: true,
          cantidadInicialUnidadesBase: true,
          productoID: true,
          Producto: { select: { nombre: true, UnidadMedida: { select: { abreviatura: true, nombre: true } } } },
          MovimientoAlmacen: { where: MOV_DEL_LOTE, select: { tipoMovimiento: true, cantidadUnidadesBase: true } },
          StockVenta: {
            select: { DetalleVenta: { where: { Venta: { estado: 1 } }, select: { cantidadUnidadesBase: true } } },
          },
        },
      }),
      prisma.stockVenta.findMany({
        where: { estado: 1 },
        select: { productoID: true, cantidadUnidadesBase: true },
      }),
      diasHastaEstante(actual.startDate, actual.endDate),
      diasHastaEstante(previo.startDate, previo.endDate),
    ]);

    const nombres = new Map(personas.map((p) => [p.id, `${p.primerNombre} ${p.apellidoPaterno}`]));
    const nombreDe = (id: number) => nombres.get(id) ?? `Usuario ${id}`;

    // Compras de las entradas: número, proveedor y quién hizo el pedido
    const compraIds = Array.from(
      new Set(
        movs
          .filter((m) => (m.tipoMovimiento === 1 || m.tipoMovimiento === MOV_INGRESO_ANULADO) && m.tipoReferencia === 1 && m.referenciaID)
          .map((m) => m.referenciaID as number),
      ),
    );
    const compras = compraIds.length
      ? await prisma.compra.findMany({
          where: { id: { in: compraIds } },
          select: { id: true, numeroCompra: true, usuarioIdRegistro: true, Proveedor: { select: { nombre: true } } },
        })
      : [];
    const compraMap = new Map(compras.map((c) => [c.id, c]));

    // ── Registro de movimientos ──
    const lineas: LineaMov[] = [];

    for (const m of movs) {
      if (!m.fechaRegistro) continue;
      const cant = Number(m.cantidadUnidadesBase);
      const base = {
        id: `mov-${m.id}`,
        fecha: m.fechaRegistro.toISOString(),
        producto: m.Producto.nombre,
        categoria: m.Producto.Categoria.nombre,
        lote: m.Lote?.numeroLote ?? null,
        cantidad: cant,
        unidad: m.Producto.UnidadMedida.abreviatura || m.Producto.UnidadMedida.nombre,
        usuarioId: m.usuarioIdRegistro,
        usuario: nombreDe(m.usuarioIdRegistro),
      };

      if (m.tipoMovimiento === 3 || m.tipoMovimiento === 4) {
        const [motivo, ...resto] = (m.observaciones ?? "").split(" · ");

        lineas.push({
          ...base,
          tipo: "ajuste",
          anulado: false,
          referencia: m.tipoMovimiento === 3 ? "Almacén" : "Estante",
          detalle: [motivo || "Ajuste", resto.join(" · ")].filter(Boolean).join(" · "),
        });
      } else if (m.tipoMovimiento === 2) {
        lineas.push({ ...base, tipo: "traslado", anulado: false, referencia: null, detalle: "Del almacén al estante" });
      } else {
        const compra = m.referenciaID ? compraMap.get(m.referenciaID) : undefined;
        const detalle = compra
          ? `${compra.Proveedor.nombre}${compra.usuarioIdRegistro !== m.usuarioIdRegistro ? ` · compra hecha por ${nombreDe(compra.usuarioIdRegistro)}` : ""}`
          : null;

        lineas.push({
          ...base,
          tipo: "entrada",
          anulado: m.tipoMovimiento === MOV_INGRESO_ANULADO,
          referencia: compra?.numeroCompra ?? null,
          detalle,
        });
      }
    }

    for (const d of detalles) {
      const v = d.Venta;

      if (!v.fechaVenta) continue;
      const p = d.StockVenta.Producto;

      lineas.push({
        id: `venta-${d.id}`,
        fecha: v.fechaVenta.toISOString(),
        tipo: "venta",
        anulado: v.estado === 2,
        producto: p.nombre,
        categoria: p.Categoria.nombre,
        lote: d.StockVenta.Lote?.numeroLote ?? null,
        cantidad: Number(d.cantidadUnidadesBase),
        unidad: p.UnidadMedida.abreviatura || p.UnidadMedida.nombre,
        usuarioId: v.usuarioRegistro,
        usuario: nombreDe(v.usuarioRegistro),
        referencia: v.numeroVenta,
        detalle: v.Cliente.nombre,
      });
    }

    lineas.sort((a, b) => b.fecha.localeCompare(a.fecha));

    // ── Lotes esperando en bodega + cuadre ──
    const esperando: LoteEsperando[] = [];
    const teoricoEstante = new Map<number, { esperado: number; nombre: string; unidad: string }>();

    for (const l of lotes) {
      const inicial = Number(l.cantidadInicialUnidadesBase);
      const mov = resumenMovimientosLote(l.MovimientoAlmacen);
      const vendido = l.StockVenta.reduce(
        (s, sv) => s + sv.DetalleVenta.reduce((t, d) => t + Number(d.cantidadUnidadesBase), 0),
        0,
      );
      const enBodega = inicial - mov.salidas + mov.ajusteAlmacen;
      const unidad = l.Producto.UnidadMedida.abreviatura || l.Producto.UnidadMedida.nombre;
      const t = teoricoEstante.get(l.productoID) ?? { esperado: 0, nombre: l.Producto.nombre, unidad };

      t.esperado += mov.salidas - vendido + mov.ajusteEstante;
      teoricoEstante.set(l.productoID, t);

      if (!l.fechaRegistro || enBodega <= 0.001) continue;
      // Un lote ya vencido no "espera": es merma, se ve en Almacén y Estado financiero
      if (l.fechaVencimiento && diaBD(l.fechaVencimiento) < hoy) continue;

      const ingreso = diaBD(l.fechaRegistro);
      const diasEnBodega = Math.round(
        (new Date(`${hoy}T00:00:00Z`).getTime() - new Date(`${ingreso}T00:00:00Z`).getTime()) / 86400000,
      );

      if (diasEnBodega >= DIAS_ESPERA) {
        esperando.push({
          producto: l.Producto.nombre,
          lote: l.numeroLote,
          ingreso,
          dias: diasEnBodega,
          unidadesEnBodega: enBodega,
          unidadBase: unidad,
          vence: l.fechaVencimiento ? diaBD(l.fechaVencimiento) : null,
        });
      }
    }

    const realEstante = new Map<number, number>();

    for (const s of stockActual) realEstante.set(s.productoID, (realEstante.get(s.productoID) ?? 0) + Number(s.cantidadUnidadesBase));

    const descuadre: DescuadreProducto[] = [];

    teoricoEstante.forEach((t, id) => {
      const real = realEstante.get(id) ?? 0;
      const dif = real - t.esperado;

      if (Math.abs(dif) > 0.01) {
        descuadre.push({ producto: t.nombre, unidadBase: t.unidad, esperado: t.esperado, real, diferencia: dif });
      }
    });

    const recortadas = lineas.length > LIMITE_LINEAS;

    return {
      success: true,
      data: {
        rango: { start: startDate, end: endDate, dias: diasEnRango(startDate, endDate) },
        lineas: recortadas ? lineas.slice(0, LIMITE_LINEAS) : lineas,
        lineasRecortadas: recortadas,
        diasHastaEstante: dias,
        diasHastaEstantePrev: diasPrev,
        esperando: esperando.sort((a, b) => b.dias - a.dias),
        descuadre: descuadre.sort((a, b) => Math.abs(b.diferencia) - Math.abs(a.diferencia)),
        productosRevisados: teoricoEstante.size,
      },
    };
  } catch (error) {
    console.error("Error en getWarehouseMovements:", error);

    return { success: false, error: "Error al calcular los movimientos de almacén" };
  }
}
