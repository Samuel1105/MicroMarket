"use server";

import { prisma } from "@/src/lib/prisma";
import { CostoProducto, getCostoPromedioBase } from "@/src/lib/report-cost";
import { cargarVencidos, VencidoDetalle } from "@/src/lib/report-vencidos";
import {
  addDays,
  diaBD,
  diasEnRango,
  rangoAnterior,
  rangoReporte,
} from "@/src/utils/report-dates";

type FinancialReportParams = {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
};

export type FinancialTotals = {
  ventas: number;
  costoVentas: number;
  utilidadBruta: number; // ventas - costo de lo vendido
  margenBruto: number; // % sobre ventas
  /** Costo de la mercadería que venció sin venderse dentro del período */
  perdidaVencimiento: number;
  /** Utilidad = ventas - costo de lo vendido - pérdida por vencimiento (antes de gastos del local) */
  utilidad: number;
  margen: number; // % sobre ventas
  compras: number;
  efectivoNeto: number; // ventas - compras (dato de caja, no utilidad)
  numeroVentas: number;
};

export type FinancialReportData = {
  rango: { start: string; end: string; dias: number };
  actual: FinancialTotals;
  anterior: FinancialTotals;
  ventasPorDia: Array<{ fecha: string; monto: number }>;
  comprasPorDia: Array<{ fecha: string; monto: number }>;
  ventasPorCategoria: Array<{ categoria: string; total: number }>;
  comprasPorProveedor: Array<{ proveedor: string; total: number; porcentaje: number }>;
  /** Productos vendidos que no tienen ninguna compra registrada (su costo cuenta como 0) */
  productosSinCosto: string[];
  /** Productos con más unidades vendidas en el período que unidades compradas en total: los registros no cuadran */
  productosVendidosDeMas: string[];
  /** Lotes que vencieron en el período con unidades sin vender, con su costo perdido */
  vencidos: VencidoDetalle[];
};

type FinancialReportResponse = {
  success: boolean;
  data?: FinancialReportData;
  error?: string;
};

/** Trae y suma ventas/compras de un período usando un mismo mapa de costos. */
async function cargarPeriodo(start: Date, end: Date, costos: Map<number, CostoProducto>) {
  const [ventas, compras] = await Promise.all([
    prisma.venta.findMany({
      where: { estado: 1, fechaVenta: { gte: start, lte: end } },
      select: {
        total: true,
        fechaVenta: true,
        DetalleVenta: {
          select: {
            total: true,
            cantidadUnidadesBase: true,
            StockVenta: {
              select: {
                productoID: true,
                Producto: { select: { nombre: true, Categoria: { select: { nombre: true } } } },
              },
            },
          },
        },
      },
    }),
    prisma.compra.findMany({
      where: { estado: 1, fechaRegistro: { gte: start, lte: end } },
      select: { total: true, fechaRegistro: true, Proveedor: { select: { nombre: true } } },
    }),
  ]);

  let totalVentas = 0;
  let costoVentas = 0;
  const sinCosto = new Set<string>();
  const vendidasBase = new Map<number, { nombre: string; unidades: number }>();
  const porCategoria = new Map<string, number>();

  for (const v of ventas) {
    totalVentas += Number(v.total);

    for (const d of v.DetalleVenta) {
      const productoID = d.StockVenta.productoID;
      const costo = costos.get(productoID);
      const unidades = Number(d.cantidadUnidadesBase);

      if (!costo) sinCosto.add(d.StockVenta.Producto.nombre);
      costoVentas += unidades * (costo?.costoUnidad ?? 0);

      const acumulada = vendidasBase.get(productoID) ?? { nombre: d.StockVenta.Producto.nombre, unidades: 0 };

      acumulada.unidades += unidades;
      vendidasBase.set(productoID, acumulada);

      const cat = d.StockVenta.Producto.Categoria.nombre;

      porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + Number(d.total));
    }
  }

  const totalCompras = compras.reduce((s, c) => s + Number(c.total), 0);
  const utilidadBruta = totalVentas - costoVentas;

  const totales: FinancialTotals = {
    ventas: totalVentas,
    costoVentas,
    utilidadBruta,
    margenBruto: totalVentas > 0 ? (utilidadBruta / totalVentas) * 100 : 0,
    perdidaVencimiento: 0, // se completa con cargarVencidos()
    utilidad: utilidadBruta,
    margen: totalVentas > 0 ? (utilidadBruta / totalVentas) * 100 : 0,
    compras: totalCompras,
    efectivoNeto: totalVentas - totalCompras,
    numeroVentas: ventas.length,
  };

  return { totales, ventas, compras, sinCosto, porCategoria, vendidasBase };
}

function conPerdida(t: FinancialTotals, vencidos: VencidoDetalle[]): FinancialTotals {
  const perdida = vencidos.reduce((a, v) => a + v.costo, 0);
  const utilidad = t.utilidadBruta - perdida;

  return { ...t, perdidaVencimiento: perdida, utilidad, margen: t.ventas > 0 ? (utilidad / t.ventas) * 100 : 0 };
}

/** Serie diaria con ceros en los días sin movimiento. */
function serieDiaria(start: string, end: string, filas: Array<{ fecha: Date | null; monto: number }>) {
  const mapa = new Map<string, number>();

  for (let d = start; d <= end; d = addDays(d, 1)) mapa.set(d, 0);
  for (const f of filas) {
    if (!f.fecha) continue;
    const dia = diaBD(f.fecha);

    mapa.set(dia, (mapa.get(dia) ?? 0) + f.monto);
  }

  return Array.from(mapa.entries()).map(([fecha, monto]) => ({ fecha, monto }));
}

export async function getFinancialReport({
  startDate,
  endDate,
}: FinancialReportParams): Promise<FinancialReportResponse> {
  try {
    const actual = rangoReporte(startDate, endDate);
    const prev = rangoAnterior(startDate, endDate);
    const previo = rangoReporte(prev.start, prev.end);

    // Un solo costo promedio (al cierre del período actual) para ambos períodos:
    // así la comparación no se distorsiona porque cambió el costo.
    const costos = await getCostoPromedioBase(actual.endDate);

    const [cur, ant, vencActual, vencPrevio] = await Promise.all([
      cargarPeriodo(actual.startDate, actual.endDate, costos),
      cargarPeriodo(previo.startDate, previo.endDate, costos),
      cargarVencidos(actual.startDate, actual.endDate),
      cargarVencidos(previo.startDate, previo.endDate),
    ]);

    const comprasProv = new Map<string, number>();

    for (const c of cur.compras) {
      comprasProv.set(c.Proveedor.nombre, (comprasProv.get(c.Proveedor.nombre) ?? 0) + Number(c.total));
    }

    return {
      success: true,
      data: {
        rango: { start: startDate, end: endDate, dias: diasEnRango(startDate, endDate) },
        actual: conPerdida(cur.totales, vencActual),
        anterior: conPerdida(ant.totales, vencPrevio),
        ventasPorDia: serieDiaria(
          startDate,
          endDate,
          cur.ventas.map((v) => ({ fecha: v.fechaVenta, monto: Number(v.total) })),
        ),
        comprasPorDia: serieDiaria(
          startDate,
          endDate,
          cur.compras.map((c) => ({ fecha: c.fechaRegistro, monto: Number(c.total) })),
        ),
        ventasPorCategoria: Array.from(cur.porCategoria.entries())
          .map(([categoria, total]) => ({ categoria, total }))
          .sort((a, b) => b.total - a.total),
        comprasPorProveedor: Array.from(comprasProv.entries())
          .map(([proveedor, total]) => ({
            proveedor,
            total,
            porcentaje: cur.totales.compras > 0 ? (total / cur.totales.compras) * 100 : 0,
          }))
          .sort((a, b) => b.total - a.total),
        productosSinCosto: Array.from(cur.sinCosto),
        productosVendidosDeMas: Array.from(cur.vendidasBase.entries())
          .filter(([id, v]) => {
            const c = costos.get(id);

            return c !== undefined && v.unidades > c.unidadesCompradas + 0.001;
          })
          .map(([, v]) => v.nombre),
        vencidos: vencActual,
      },
    };
  } catch (error) {
    console.error("Error al generar reporte financiero:", error);

    return { success: false, error: "Error al generar el reporte financiero" };
  }
}
