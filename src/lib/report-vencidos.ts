import { prisma } from "@/src/lib/prisma";
import { getBoliviaTime } from "@/src/utils/date";
import { diaBD } from "@/src/utils/report-dates";

export type VencidoDetalle = {
  productoID: number;
  producto: string;
  categoria: string;
  lote: string;
  venciO: string; // YYYY-MM-DD
  unidades: number;
  costo: number;
};

/**
 * Mercadería que venció dentro del rango sin haberse vendido.
 * Un lote se considera vencido desde el día siguiente a su fecha de vencimiento; lo que
 * quedaba sin vender ese día (comprado - vendido hasta la fecha de vencimiento) es pérdida,
 * valorada al costo por unidad de ese lote.
 */
export async function cargarVencidos(start: Date, end: Date): Promise<VencidoDetalle[]> {
  const hoy = getBoliviaTime().toISOString().slice(0, 10);
  const inicioHoy = new Date(`${hoy}T00:00:00.000Z`);

  const lotes = await prisma.lote.findMany({
    where: { estado: 1, fechaVencimiento: { gte: start, lte: end, lt: inicioHoy } },
    select: {
      numeroLote: true,
      fechaVencimiento: true,
      cantidadInicialUnidadesBase: true,
      Producto: { select: { id: true, nombre: true, Categoria: { select: { nombre: true } } } },
      DetalleCompra: {
        select: { total: true, Lote: { where: { estado: 1 }, select: { cantidadInicialUnidadesBase: true } } },
      },
      StockVenta: {
        select: {
          DetalleVenta: {
            where: { Venta: { estado: 1 } },
            select: { cantidadUnidadesBase: true, Venta: { select: { fechaVenta: true } } },
          },
        },
      },
    },
  });

  const resultado: VencidoDetalle[] = [];

  for (const l of lotes) {
    if (!l.fechaVencimiento) continue;
    const finDelDia = new Date(l.fechaVencimiento.getTime() + 86400000 - 1);
    let vendidas = 0;

    for (const sv of l.StockVenta) {
      for (const d of sv.DetalleVenta) {
        if (d.Venta.fechaVenta && d.Venta.fechaVenta <= finDelDia) vendidas += Number(d.cantidadUnidadesBase);
      }
    }

    const restante = Number(l.cantidadInicialUnidadesBase) - vendidas;

    if (restante <= 0.001) continue;

    const unidadesDetalle = l.DetalleCompra.Lote.reduce((a, x) => a + Number(x.cantidadInicialUnidadesBase), 0);
    const costoUnidad = unidadesDetalle > 0 ? Number(l.DetalleCompra.total) / unidadesDetalle : 0;

    resultado.push({
      productoID: l.Producto.id,
      producto: l.Producto.nombre,
      categoria: l.Producto.Categoria.nombre,
      lote: l.numeroLote,
      venciO: diaBD(l.fechaVencimiento),
      unidades: restante,
      costo: restante * costoUnidad,
    });
  }

  return resultado.sort((a, b) => b.costo - a.costo);
}
