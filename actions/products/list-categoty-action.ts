"use server";
import { prisma } from "@/src/lib/prisma";
import { categoryList } from "@/src/schema/SchemaProduts";

export async function ListCategory() {
  try {
    const categories = await prisma.categoria.findMany({
      where: {
        estado: 1,
      },
      include: {
        _count: {
          select: {
            Producto: {
              where: {
                estado: 1, // Opcional: solo productos activos
              },
            },
          },
        },
      },
    });

    // Transformar al formato exacto que necesitas
    const formattedCategories = categories.map((category) => ({
      id: category.id,
      nombre: category.nombre,
      cantidadProductos: category._count.Producto,
    }));

    const response = categoryList.safeParse(formattedCategories);

    if (response.success) {
      return {
        data: response.data,
      };
    } else {
      return {
        error: response.error.message,
      };
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
