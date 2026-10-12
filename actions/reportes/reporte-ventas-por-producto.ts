"use server";

import { prisma } from "@/src/lib/prisma";
import { diasEnRango, rangoAnterior, rangoReporte } from "@/src/utils/report-dates";

type Params = { startDate: string; endDate: string };

export type ClaseABC = "A" | "B" | "C";

export type ProductoVendido = {
  id: number;
  nombre: string;
  categoria: string;
  unidadBase: string;
  ingresos: number;
  unidades: number; // en la unidad base del producto
  ventas: number; // cantidad de ventas (tickets) donde aparece
  participacion: number; // % de las ventas totales
  acumulado: number; // % acumulado (Pareto)
  clase: ClaseABC; // A = el 80% de las ventas, B = hasta el 95%, C = el resto
  ingresosAnterior: number;
  cambio: number | null; // % vs período anterior; null si no se vendió antes
  esNuevo: boolean; // se vendió ahora y no en el período anterior
};

export type VentasPorProductoData = {
  rango: { start: string; end: string; dias: number };
  total: number;
  totalAnterior: number;
  productos: ProductoVendido[]; // de más a menos ingresos
  categorias: Array<{ categoria: string; ingresos: number; participacion: number }>;
  /** Productos activos del catálogo que no se vendieron en el período */
  sinVentas: Array<{ id: number; nombre: string; categoria: string; ultimaVenta: string | null }>;
  catalogo: number;
  claseA: number; // cantidad de productos clase A
};

type Acum = { ingresos: number; unidades: number; ventas: Set<number> };

async function cargar(start: Date, end: Date) {
  const det = await prisma.detalleVenta.findMany({
    where: { Venta: { estado: 1, fechaVenta: { gte: start, lte: end } } },
    select: {
      total: true,
      cantidadUnidadesBase: true,
      ventaID: true,
      StockVenta: { select: { productoID: true } },
    },
  });
  const mapa = new Map<number, Acum>();

  for (const d of det) {
    const id = d.StockVenta.productoID;
    const a = mapa.get(id) ?? { ingresos: 0, unidades: 0, ventas: new Set<number>() };

    a.ingresos += Number(d.total);
    a.unidades += Number(d.cantidadUnidadesBase);
    a.ventas.add(d.ventaID);
    mapa.set(id, a);
  }

  return mapa;
}

export async function getSalesByProduct({
  startDate,
  endDate,
}: Params): Promise<{ success: boolean; data?: VentasPorProductoData; error?: string }> {
  try {
    const actual = rangoReporte(startDate, endDate);
    const prev = rangoAnterior(startDate, endDate);
    const previo = rangoReporte(prev.start, prev.end);

    const [act, ant, catalogo, ultimas] = await Promise.all([
      cargar(actual.startDate, actual.endDate),
      cargar(previo.startDate, previo.endDate),
      prisma.producto.findMany({
        where: { estado: 1 },
        select: {
          id: true,
          nombre: true,
          Categoria: { select: { nombre: true } },
          UnidadMedida: { select: { abreviatura: true, nombre: true } },
        },
      }),
      prisma.detalleVenta.findMany({
        where: { Venta: { estado: 1, fechaVenta: { lt: actual.startDate } } },
        select: { StockVenta: { select: { productoID: true } }, Venta: { select: { fechaVenta: true } } },
      }),
    ]);

    const total = Array.from(act.values()).reduce((s, a) => s + a.ingresos, 0);
    const totalAnterior = Array.from(ant.values()).reduce((s, a) => s + a.ingresos, 0);
    const info = new Map(catalogo.map((p) => [p.id, p]));

    let acumulado = 0;
    const productos: ProductoVendido[] = Array.from(act.entries())
      .filter(([id]) => info.has(id))
      .sort((a, b) => b[1].ingresos - a[1].ingresos)
      .map(([id, a]) => {
        const p = info.get(id)!;
        const antes = ant.get(id)?.ingresos ?? 0;
        const antesAcum = acumulado;

        acumulado += a.ingresos;

        return {
          id,
          nombre: p.nombre,
          categoria: p.Categoria.nombre,
          unidadBase: p.UnidadMedida.abreviatura || p.UnidadMedida.nombre,
          ingresos: a.ingresos,
          unidades: a.unidades,
          ventas: a.ventas.size,
          participacion: total ? (a.ingresos / total) * 100 : 0,
          acumulado: total ? (acumulado / total) * 100 : 0,
          // Un producto es A si al sumarlo todavía no habíamos llegado al 80%
          clase: (total && antesAcum / total < 0.8 ? "A" : total && antesAcum / total < 0.95 ? "B" : "C") as ClaseABC,
          ingresosAnterior: antes,
          cambio: antes > 0 ? ((a.ingresos - antes) / antes) * 100 : null,
          esNuevo: antes === 0,
        };
      });

    const catMap = new Map<string, number>();

    for (const p of productos) catMap.set(p.categoria, (catMap.get(p.categoria) ?? 0) + p.ingresos);

    const ultima = new Map<number, string>();

    for (const u of ultimas) {
      const f = u.Venta.fechaVenta?.toISOString().slice(0, 10);
      const id = u.StockVenta.productoID;

      if (f && (!ultima.get(id) || f > ultima.get(id)!)) ultima.set(id, f);
    }

    return {
      success: true,
      data: {
        rango: { start: startDate, end: endDate, dias: diasEnRango(startDate, endDate) },
        total,
        totalAnterior,
        productos,
        categorias: Array.from(catMap.entries())
          .map(([categoria, ingresos]) => ({ categoria, ingresos, participacion: total ? (ingresos / total) * 100 : 0 }))
          .sort((a, b) => b.ingresos - a.ingresos),
        sinVentas: catalogo
          .filter((p) => !act.has(p.id))
          .map((p) => ({ id: p.id, nombre: p.nombre, categoria: p.Categoria.nombre, ultimaVenta: ultima.get(p.id) ?? null })),
        catalogo: catalogo.length,
        claseA: productos.filter((p) => p.clase === "A").length,
      },
    };
  } catch (error) {
    console.error("Error en getSalesByProduct:", error);

    return { success: false, error: "Error al calcular las ventas por producto" };
  }
}
