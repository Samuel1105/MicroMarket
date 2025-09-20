"use server";
import { prisma } from "@/src/lib/prisma";
import { ConversionForm, ProductoCreate } from "@/src/schema/SchemaProduts";
import { getBoliviaTime } from "@/src/utils/date";

// type ConversionInput = {
//   unidadOrigenID: number;
//   unidadDestinoID: number;
//   factorConversion: number;
//   precioVentaUnitario: number;
//   estado?: number;
// };

export async function createProductAction({
  producto,
  conversiones,
}: {
  producto: ProductoCreate;
  conversiones: ConversionForm[];
}) {
  return prisma.$transaction(async (tx) => {
    // Reglas mínimas para la conversión base (debe ser la primera)
    const base = conversiones[0];

    if (
      base.unidadOrigenID !== producto.unidadBaseID ||
      base.unidadDestinoID !== base.unidadOrigenID ||
      base.factorConversion !== 1
    ) {
      throw new Error(
        "La primera conversión debe ser la base: origen = destino = unidadBaseID y factor = 1.",
      );
    }

    await tx.producto.create({
      data: {
        nombre: producto.nombre,
        descripcion: producto.descripcion ?? null,
        categoriaID: producto.categoriaID,
        proveedorID: producto.proveedorID,
        unidadBaseID: producto.unidadBaseID,
        fechaRegistro: getBoliviaTime(),
        usuarioRegistro: +producto.usuarioRegistro,
        // ⬇️ Insert anidado: Prisma completa productoID por ti
        ConversionUnidad: {
          create: conversiones.map((c) => ({
            unidadOrigenID: c.unidadOrigenID,
            unidadDestinoID: c.unidadDestinoID,
            factorConversion: c.factorConversion,
            precioVentaUnitario: c.precioVentaUnitario,
            estado: c.estado ?? 1,
          })),
        },
      },
      include: { ConversionUnidad: true },
    });

    return { ok: true };
  });
}
