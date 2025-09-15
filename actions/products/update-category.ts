"use server"

import { prisma } from "@/src/lib/prisma";
import { CategoryUpdate } from "@/src/schema/SchemaProduts";
import { getBoliviaTime } from "@/src/utils/date";

export async function updateCategory(category:CategoryUpdate) {
    try {
        await prisma.categoria.update({
            where: {
                id: category.id
            },
            data: {
                nombre: category.nombre,
                fechaActualizacion: category.fechaActualizacion,
                usuarioIdActualizacion: category.usuarioIdActualizacion
            }
        })
        return {
            success: true,
            message: "Categoria Actualziado Correctamente" 
        }
    } catch (error) {
        return {
            error: error instanceof Error ? error.message : "Error desconocido"
        }
    }
}

export async function deleteCategory(categoryId: number , userId: number) {
    try {
        await prisma.categoria.update({
            where: {
                id: categoryId
            },
            data: {
                estado: 0,
                fechaActualizacion: getBoliviaTime(),
                usuarioIdActualizacion: userId
            }
        })
        return {
            success: true,
            message: "Categoria Eliminado Correctamente" 
        }
    } catch (error) {
        return {
            error: error instanceof Error ? error.message : "Error desconocido"
        }
    }
}
