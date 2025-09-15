"use server"

import { prisma } from "@/src/lib/prisma";
import {  SupplierUpdate } from "@/src/schema/SchemaContact";
import { getBoliviaTime } from "@/src/utils/date";

export async function updateSupplierAction(data: SupplierUpdate) {
    try {
        const currentCustomer = await prisma.proveedor.findFirst({
            where: {
                id: data.id,
                estado: 1
            }
        })

        if (!currentCustomer) {
            return {
                error: "Cliente no encontrado"
            }
        }

        const existingSupplier = await prisma.proveedor.findFirst({
            where: {
                celular: data.celular,
                estado: 1,
                id: {
                    not: data.id
                }
            }
        })
       
        if (existingSupplier) {
            return {
                error: "Ya existe otro proveedor con este numero"
            };
        }
        await prisma.proveedor.update({
            where: {
                id: data.id
            },
            data: {
                nombre: data.nombre,
                celular: data.celular,
                correo: data.correo,
                direccion: data.direccion,
                fechaActualizacion: data.fechaActualizacion,
                usuarioIdActualizacion: data.usuarioIdActualizacion
            }
        })

        return {
            success: true,
            message: 'Proveedor actualizado exitosamente'
        };

    } catch (error) {
        console.error("Error al actualizar el proveedor:", error);
        return {
            error: error instanceof Error ? error.message : "Error desconocido al actualizar proveedor"
        };
    }
}

export async function deleteSupplierAction(id: number, userId: number) {

    try {
        const response = await prisma.proveedor.update({
            where: {
                id: id
            },
            data: {
                estado: 0,
                fechaActualizacion: getBoliviaTime(),
                usuarioIdActualizacion: userId
            }

        })

        if (response) {
            return {
                success: true,
                message: 'Proveedor Eliminado exitosamente'
            };
        }
    } catch (error) {
        console.error("Error al eliminar el proveedor:", error);
        return {
            error: error instanceof Error ? error.message : "Error desconocido al eliminar el proveedor"
        };
    }

}