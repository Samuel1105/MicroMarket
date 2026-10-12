"use server";
import { CustomerListSchema } from "./../../src/schema/SchemaContact";

import { prisma } from "@/src/lib/prisma";

export async function ListCustomer() {
  try {
    const clients = await prisma.cliente.findMany({
      // El "Cliente general" (carnet 0) es un registro del sistema para ventas rápidas: no se lista ni se edita
      where: { estado: 1, carnet: { not: "0" } },
      select: {
        id: true,
        carnet: true,
        nombre: true,
        correo: true,
      },
    });
    const response = CustomerListSchema.safeParse(clients);
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
