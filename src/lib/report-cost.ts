import { prisma } from "@/src/lib/prisma";

export type CostoProducto = {
  /** Costo promedio ponderado por unidad base */
  costoUnidad: number;
  /** Unidades base compradas en total hasta la fecha */
  unidadesCompradas: number;
};

/**
 * Costo promedio ponderado por UNIDAD BASE de cada producto, con todas las compras
 * activas hasta `hasta` (incluida).
 *
 * Las unidades base salen de los lotes que crea cada compra (cantidadInicialUnidadesBase),
 * que es la cifra confiable: no depende de que exista una conversión registrada para la
 * unidad en que se compró. Si una compra no tiene lotes, se usa la tabla de conversión.
 * Se usa el total de la línea (ya con descuento).
 *
 * Es el costo que usan Estado financiero y Rentabilidad, para que ambos coincidan.
 */
export async function getCostoPromedioBase(hasta: Date): Promise<Map<number, CostoProducto>> {
  const [compras, conversiones] = await Promise.all([
    prisma.detalleCompra.findMany({
      where: { estado: 1, Compra: { estado: 1, fechaRegistro: { lte: hasta } } },
      select: {
        productoID: true,
        unidadMedidaID: true,
        cantidadComprada: true,
        total: true,
        Lote: { where: { estado: 1 }, select: { cantidadInicialUnidadesBase: true } },
      },
    }),
    prisma.conversionUnidad.findMany({
      where: { estado: 1 },
      select: { productoID: true, unidadOrigenID: true, factorConversion: true },
    }),
  ]);

  const factor = new Map<string, number>();

  for (const c of conversiones) factor.set(`${c.productoID}-${c.unidadOrigenID}`, Number(c.factorConversion));

  const acumulado = new Map<number, { costo: number; unidades: number }>();

  for (const c of compras) {
    const unidadesLotes = c.Lote.reduce((s, l) => s + Number(l.cantidadInicialUnidadesBase), 0);
    const unidades =
      unidadesLotes > 0
        ? unidadesLotes
        : Number(c.cantidadComprada) * (factor.get(`${c.productoID}-${c.unidadMedidaID}`) || 1);
    const acc = acumulado.get(c.productoID) ?? { costo: 0, unidades: 0 };

    acc.costo += Number(c.total);
    acc.unidades += unidades;
    acumulado.set(c.productoID, acc);
  }

  const resultado = new Map<number, CostoProducto>();

  acumulado.forEach((v, id) =>
    resultado.set(id, {
      costoUnidad: v.unidades > 0 ? v.costo / v.unidades : 0,
      unidadesCompradas: v.unidades,
    }),
  );

  return resultado;
}
