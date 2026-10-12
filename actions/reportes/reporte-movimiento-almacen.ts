"use server";

import { prisma } from "@/src/lib/prisma";
import { getCostoPromedioBase } from "@/src/lib/report-cost";
import { getBoliviaTime } from "@/src/utils/date";
import { addDays, diaBD, diasEnRango, rangoAnterior, rangoReporte } from "@/src/utils/report-dates";

type Params = { startDate: string; endDate: string };

/** Un lote que lleva más de estos días en bodega sin pasar al estante se marca como "esperando" */
const DIAS_ESPERA = 15;

export type ResumenMov = {
  entradas: number; // Bs. al costo
  traslados: number; // Bs. al costo
  nEntradas: number; // lotes que ingresaron
  nTraslados: number; // traslados registrados
};

export type ResponsableMov = {
  id: number;
  nombre: string;
  entradas: number;
  traslados: number;
  valorEntradas: number;
  valorTraslados: number;
};

export type LoteEsperando = {
  producto: string;
  lote: string;
  ingreso: string; // YYYY-MM-DD
  dias: number;
  unidadesEnBodega: number;
  unidadBase: string;
  valor: number;
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
  actual: ResumenMov;
  anterior: ResumenMov;
  /** Días promedio entre que el lote entra y su primer traslado (solo traslados del período) */
  diasHastaEstante: number | null;
  diasHastaEstantePrev: number | null;
  porDia: Array<{ fecha: string; entradas: number; traslados: number }>;
  responsables: ResponsableMov[];
  esperando: LoteEsperando[];
  descuadre: DescuadreProducto[];
  productosRevisados: number;
};

async function resumen(start: Date, end: Date, costos: Map<number, { costoUnidad: number }>) {
  const movs = await prisma.movimientoAlmacen.findMany({
    where: { tipoMovimiento: { in: [1, 2] }, fechaRegistro: { gte: start, lte: end } },
    select: {
      tipoMovimiento: true,
      productoID: true,
      loteID: true,
      cantidadUnidadesBase: true,
      fechaRegistro: true,
      usuarioIdRegistro: true,
      Lote: { select: { fechaRegistro: true } },
    },
  });

  const r: ResumenMov = { entradas: 0, traslados: 0, nEntradas: 0, nTraslados: 0 };
  let sumaDias = 0;
  let nDias = 0;

  for (const m of movs) {
    const valor = Number(m.cantidadUnidadesBase) * (costos.get(m.productoID)?.costoUnidad ?? 0);

    if (m.tipoMovimiento === 1) {
      r.entradas += valor;
      r.nEntradas += 1;
    } else {
      r.traslados += valor;
      r.nTraslados += 1;

      if (m.fechaRegistro && m.Lote?.fechaRegistro) {
        sumaDias += Math.max((m.fechaRegistro.getTime() - m.Lote.fechaRegistro.getTime()) / 86400000, 0);
        nDias += 1;
      }
    }
  }

  return { r, movs, dias: nDias ? sumaDias / nDias : null };
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

    const costos = await getCostoPromedioBase(new Date(`${hoy}T23:59:59.999Z`));

    const [act, ant, personas, lotes, stockActual] = await Promise.all([
      resumen(actual.startDate, actual.endDate, costos),
      resumen(previo.startDate, previo.endDate, costos),
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
          MovimientoAlmacen: { where: { tipoMovimiento: 2 }, select: { cantidadUnidadesBase: true } },
          StockVenta: {
            select: { DetalleVenta: { where: { Venta: { estado: 1 } }, select: { cantidadUnidadesBase: true } } },
          },
        },
      }),
      prisma.stockVenta.findMany({
        where: { estado: 1 },
        select: { productoID: true, cantidadUnidadesBase: true },
      }),
    ]);

    // ── Por día ──
    const dias = diasEnRango(startDate, endDate);
    const porDiaMap = new Map<string, { entradas: number; traslados: number }>();

    for (let i = 0; i < dias; i++) porDiaMap.set(addDays(startDate, i), { entradas: 0, traslados: 0 });

    // ── Por responsable ──
    const nombres = new Map(personas.map((p) => [p.id, `${p.primerNombre} ${p.apellidoPaterno}`]));
    const resp = new Map<number, ResponsableMov>();

    for (const m of act.movs) {
      if (!m.fechaRegistro) continue;
      const valor = Number(m.cantidadUnidadesBase) * (costos.get(m.productoID)?.costoUnidad ?? 0);
      const dia = porDiaMap.get(diaBD(m.fechaRegistro));
      const r =
        resp.get(m.usuarioIdRegistro) ??
        {
          id: m.usuarioIdRegistro,
          nombre: nombres.get(m.usuarioIdRegistro) ?? `Usuario ${m.usuarioIdRegistro}`,
          entradas: 0,
          traslados: 0,
          valorEntradas: 0,
          valorTraslados: 0,
        };

      if (m.tipoMovimiento === 1) {
        if (dia) dia.entradas += valor;
        r.entradas += 1;
        r.valorEntradas += valor;
      } else {
        if (dia) dia.traslados += valor;
        r.traslados += 1;
        r.valorTraslados += valor;
      }

      resp.set(m.usuarioIdRegistro, r);
    }

    // ── Lotes esperando en bodega + cuadre ──
    const esperando: LoteEsperando[] = [];
    const teoricoEstante = new Map<number, { esperado: number; nombre: string; unidad: string }>();

    for (const l of lotes) {
      const inicial = Number(l.cantidadInicialUnidadesBase);
      const extraido = l.MovimientoAlmacen.reduce((s, m) => s + Number(m.cantidadUnidadesBase), 0);
      const vendido = l.StockVenta.reduce(
        (s, sv) => s + sv.DetalleVenta.reduce((t, d) => t + Number(d.cantidadUnidadesBase), 0),
        0,
      );
      const enBodega = inicial - extraido;
      const unidad = l.Producto.UnidadMedida.abreviatura || l.Producto.UnidadMedida.nombre;
      const t = teoricoEstante.get(l.productoID) ?? { esperado: 0, nombre: l.Producto.nombre, unidad };

      t.esperado += extraido - vendido;
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
          valor: enBodega * (costos.get(l.productoID)?.costoUnidad ?? 0),
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

    return {
      success: true,
      data: {
        rango: { start: startDate, end: endDate, dias },
        actual: act.r,
        anterior: ant.r,
        diasHastaEstante: act.dias,
        diasHastaEstantePrev: ant.dias,
        porDia: Array.from(porDiaMap.entries()).map(([fecha, v]) => ({ fecha, ...v })),
        responsables: Array.from(resp.values()).sort(
          (a, b) => b.valorEntradas + b.valorTraslados - (a.valorEntradas + a.valorTraslados),
        ),
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
