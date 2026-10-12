"use server";

import { prisma } from "@/src/lib/prisma";
import { CostoProducto, getCostoPromedioBase } from "@/src/lib/report-cost";
import { MARGEN_MINIMO } from "@/src/lib/report-config";
import { cargarVencidos, VencidoDetalle } from "@/src/lib/report-vencidos";
import { diasEnRango, rangoAnterior, rangoReporte } from "@/src/utils/report-dates";

type Params = { startDate: string; endDate: string };

export type EstadoProducto = "pierde" | "revisar" | "ok";

export type ProductoRentabilidad = {
  id: number;
  nombre: string;
  categoria: string;
  unidades: number;
  ingresos: number;
  costo: number;
  utilidadBruta: number; // ingresos - costo de lo vendido
  perdidaVencimiento: number;
  utilidad: number; // utilidadBruta - perdidaVencimiento
  margenBruto: number; // % sobre ingresos, sin contar lo vencido
  margen: number; // % sobre ingresos, ya restando lo vencido
  precioPromedio: number;
  costoUnidad: number;
  gananciaUnidad: number;
  estado: EstadoProducto;
  motivo: string | null;
  /** Precio que dejaría el margen mínimo (redondeado hacia arriba a 0.50) */
  precioSugerido: number | null;
  /** Utilidad extra si se vendiera lo mismo al precio sugerido */
  utilidadExtra: number | null;
};

export type RentabilidadTotales = {
  ingresos: number;
  costo: number;
  utilidadBruta: number;
  perdidaVencimiento: number;
  utilidad: number;
  margen: number; // ponderado: utilidad total / ingresos totales
};

export type RentabilidadData = {
  rango: { start: string; end: string; dias: number };
  margenMinimo: number;
  actual: RentabilidadTotales;
  anterior: RentabilidadTotales;
  productos: ProductoRentabilidad[]; // de más a menos utilidad
  categorias: Array<{ categoria: string; utilidad: number; ingresos: number }>;
  aRevisar: ProductoRentabilidad[];
};

type Acum = { id: number; nombre: string; categoria: string; unidades: number; ingresos: number; costo: number };

async function ventasPorProducto(start: Date, end: Date, costos: Map<number, CostoProducto>) {
  const detalles = await prisma.detalleVenta.findMany({
    where: { Venta: { estado: 1, fechaVenta: { gte: start, lte: end } } },
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
  });

  const mapa = new Map<number, Acum>();

  for (const d of detalles) {
    const id = d.StockVenta.productoID;
    const acc =
      mapa.get(id) ??
      {
        id,
        nombre: d.StockVenta.Producto.nombre,
        categoria: d.StockVenta.Producto.Categoria.nombre,
        unidades: 0,
        ingresos: 0,
        costo: 0,
      };
    const unidades = Number(d.cantidadUnidadesBase);

    acc.unidades += unidades;
    acc.ingresos += Number(d.total);
    acc.costo += unidades * (costos.get(id)?.costoUnidad ?? 0);
    mapa.set(id, acc);
  }

  return mapa;
}

function totales(productos: Array<{ ingresos: number; costo: number; perdidaVencimiento: number }>): RentabilidadTotales {
  const ingresos = productos.reduce((s, p) => s + p.ingresos, 0);
  const costo = productos.reduce((s, p) => s + p.costo, 0);
  const perdida = productos.reduce((s, p) => s + p.perdidaVencimiento, 0);
  const utilidad = ingresos - costo - perdida;

  return {
    ingresos,
    costo,
    utilidadBruta: ingresos - costo,
    perdidaVencimiento: perdida,
    utilidad,
    margen: ingresos > 0 ? (utilidad / ingresos) * 100 : 0,
  };
}

function bs(n: number) {
  return `Bs. ${n.toFixed(2)}`;
}

function armarProducto(a: Acum, vencidos: VencidoDetalle[], costos: Map<number, CostoProducto>): ProductoRentabilidad {
  const perdida = vencidos.filter((v) => v.productoID === a.id).reduce((s, v) => s + v.costo, 0);
  const utilidadBruta = a.ingresos - a.costo;
  const utilidad = utilidadBruta - perdida;
  const margenBruto = a.ingresos > 0 ? (utilidadBruta / a.ingresos) * 100 : 0;
  const precioPromedio = a.unidades > 0 ? a.ingresos / a.unidades : 0;
  const costoUnidad = a.unidades > 0 ? a.costo / a.unidades : (costos.get(a.id)?.costoUnidad ?? 0);
  const gananciaUnidad = precioPromedio - costoUnidad;

  let estado: EstadoProducto = "ok";
  let motivo: string | null = null;
  let precioSugerido: number | null = null;
  let utilidadExtra: number | null = null;

  if (utilidad < 0) {
    estado = "pierde";
    if (a.ingresos === 0) {
      motivo = `No vendiste nada y se venció mercadería por ${bs(perdida)}.`;
    } else if (utilidadBruta < 0) {
      motivo = `Lo vendes por debajo de su costo: te cuesta ${bs(costoUnidad)} y lo vendes a ${bs(precioPromedio)}.`;
    } else {
      motivo = `Parece rentable (margen ${margenBruto.toFixed(1)}%), pero se venció ${bs(perdida)} y en total perdiste ${bs(-utilidad)}.`;
    }
  } else if (a.ingresos > 0 && margenBruto < MARGEN_MINIMO) {
    estado = "revisar";
    motivo = `Vendiste ${Math.round(a.unidades)} unidades pero dejas solo ${bs(gananciaUnidad)} por unidad (margen ${margenBruto.toFixed(1)}%).`;
  }

  if (a.unidades > 0 && costoUnidad > 0 && margenBruto < MARGEN_MINIMO) {
    const sugerido = Math.ceil((costoUnidad / (1 - MARGEN_MINIMO / 100)) * 2) / 2;

    if (sugerido > precioPromedio) {
      precioSugerido = sugerido;
      utilidadExtra = (sugerido - precioPromedio) * a.unidades;
    }
  }

  return {
    id: a.id,
    nombre: a.nombre,
    categoria: a.categoria,
    unidades: a.unidades,
    ingresos: a.ingresos,
    costo: a.costo,
    utilidadBruta,
    perdidaVencimiento: perdida,
    utilidad,
    margenBruto,
    margen: a.ingresos > 0 ? (utilidad / a.ingresos) * 100 : 0,
    precioPromedio,
    costoUnidad,
    gananciaUnidad,
    estado,
    motivo,
    precioSugerido,
    utilidadExtra,
  };
}

export async function getProductProfitability({
  startDate,
  endDate,
}: Params): Promise<{ success: boolean; data?: RentabilidadData; error?: string }> {
  try {
    const actual = rangoReporte(startDate, endDate);
    const prev = rangoAnterior(startDate, endDate);
    const previo = rangoReporte(prev.start, prev.end);

    // Mismo costo promedio que el Estado financiero → las cifras coinciden
    const costos = await getCostoPromedioBase(actual.endDate);

    const [ventasAct, ventasPrev, vencAct, vencPrev] = await Promise.all([
      ventasPorProducto(actual.startDate, actual.endDate, costos),
      ventasPorProducto(previo.startDate, previo.endDate, costos),
      cargarVencidos(actual.startDate, actual.endDate),
      cargarVencidos(previo.startDate, previo.endDate),
    ]);

    // Productos con mercadería vencida pero sin ventas en el período también cuentan
    for (const v of vencAct) {
      if (!ventasAct.has(v.productoID)) {
        ventasAct.set(v.productoID, {
          id: v.productoID,
          nombre: v.producto,
          categoria: v.categoria,
          unidades: 0,
          ingresos: 0,
          costo: 0,
        });
      }
    }

    const productos = Array.from(ventasAct.values())
      .map((a) => armarProducto(a, vencAct, costos))
      .sort((a, b) => b.utilidad - a.utilidad);

    const catMap = new Map<string, { utilidad: number; ingresos: number }>();

    for (const p of productos) {
      const c = catMap.get(p.categoria) ?? { utilidad: 0, ingresos: 0 };

      c.utilidad += p.utilidad;
      c.ingresos += p.ingresos;
      catMap.set(p.categoria, c);
    }

    const anterior = totales(
      Array.from(ventasPrev.values()).map((a) => ({
        ingresos: a.ingresos,
        costo: a.costo,
        perdidaVencimiento: vencPrev.filter((v) => v.productoID === a.id).reduce((s, v) => s + v.costo, 0),
      })),
    );
    // Pérdida del período anterior de productos que no tuvieron ventas
    const idsPrev = new Set(Array.from(ventasPrev.keys()));
    const perdidaSinVentasPrev = vencPrev.filter((v) => !idsPrev.has(v.productoID)).reduce((s, v) => s + v.costo, 0);

    anterior.perdidaVencimiento += perdidaSinVentasPrev;
    anterior.utilidad -= perdidaSinVentasPrev;
    anterior.margen = anterior.ingresos > 0 ? (anterior.utilidad / anterior.ingresos) * 100 : 0;

    return {
      success: true,
      data: {
        rango: { start: startDate, end: endDate, dias: diasEnRango(startDate, endDate) },
        margenMinimo: MARGEN_MINIMO,
        actual: totales(productos),
        anterior,
        productos,
        categorias: Array.from(catMap.entries())
          .map(([categoria, v]) => ({ categoria, ...v }))
          .sort((a, b) => b.utilidad - a.utilidad),
        aRevisar: productos.filter((p) => p.estado !== "ok").sort((a, b) => a.utilidad - b.utilidad),
      },
    };
  } catch (error) {
    console.error("Error en getProductProfitability:", error);

    return { success: false, error: "Error al calcular la rentabilidad" };
  }
}
