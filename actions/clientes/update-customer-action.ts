"use server";

import { prisma } from "@/src/lib/prisma";
import { CustomerUpdate } from "@/src/schema/SchemaContact";
import { getBoliviaTime } from "@/src/utils/date";

export async function updateCustomerAction(data: CustomerUpdate) {
  try {
    const currentCustomer = await prisma.cliente.findFirst({
      where: {
        id: data.id,
        estado: 1,
      },
    });

    if (!currentCustomer) {
      return {
        error: "Cliente no encontrado",
      };
    }

    const existingCustomerEmail = await prisma.cliente.findFirst({
      where: {
        correo: data.correo,
        estado: 1,
        id: {
          not: data.id,
        },
      },
    });

    const existingCustomerCi = await prisma.cliente.findFirst({
      where: {
        carnet: data.carnet,
        estado: 1,
        id: {
          not: data.id,
        },
      },
    });

    if (existingCustomerEmail) {
      return {
        error: "Ya existe otro cliente con este correo electrónico",
      };
    }

    if (existingCustomerCi) {
      return {
        error: "Ya existe otro cliente con este numero de carnet",
      };
    }

    await prisma.cliente.update({
      where: {
        id: data.id,
      },
      data: {
        nombre: data.nombre,
        carnet: data.carnet,
        correo: data.correo,
        fechaActualizacion: data.fechaActualizacion,
        usuarioIdActualizacion: data.usuarioIdActualizacion,
      },
    });

    return {
      success: true,
      message: "Cliente actualizado exitosamente",
    };
  } catch (error) {
    console.error("Error al actualizar el cliente:", error);

    return {
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al crear usuario",
    };
  }
}

export async function deleteCustomerAction(id: number, userId: number) {
  try {
    const response = await prisma.cliente.update({
      where: {
        id: id,
      },
      data: {
        estado: 0,
        fechaActualizacion: getBoliviaTime(),
        usuarioIdActualizacion: userId,
      },
    });

    if (response) {
      return {
        success: true,
        message: "Cliente Eliminado exitosamente",
      };
    }
  } catch (error) {
    console.error("Error al eliminar el cliente:", error);

    return {
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al eliminar el cliente",
    };
  }
}
