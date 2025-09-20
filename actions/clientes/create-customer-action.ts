"use server";
import { prisma } from "@/src/lib/prisma";
import { CustomerCreate } from "@/src/schema/SchemaContact";
import { getBoliviaTime } from "@/src/utils/date";

export async function createCustomerAction(data: CustomerCreate) {
  try {
    const existCustomer = await prisma.cliente.findFirst({
      where: {
        carnet: data.carnet,
        estado: 1,
      },
    });
    const existCustomerCi = await prisma.cliente.findFirst({
      where: {
        correo: data.correo,
        estado: 1,
      },
    });

    if (existCustomer) {
      return {
        error: "Ya existe un cliente con este carnet",
      };
    }
    if (existCustomerCi) {
      return {
        error: "Ya existe un cliente con este correo",
      };
    }

    await prisma.cliente.create({
      data: {
        carnet: data.carnet,
        nombre: data.nombre,
        correo: data.correo,
        usuarioIdRegistro: data.usuarioIdRegistro,
        fechaRegistro: getBoliviaTime(),
      },
    });

    return {
      success: true,
      message: "Cliente registrado existosamente",
    };
  } catch (error) {
    console.error("Error al crear un cliente:", error);

    return {
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al crear cliente",
    };
  }
}
