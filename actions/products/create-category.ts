"use server"

import { prisma } from "@/src/lib/prisma";
import { CategoryCreate } from "@/src/schema/SchemaProduts";

export async function CreateCategoty(category : CategoryCreate) {
    try {
        await prisma.categoria.create({
            data: {
                nombre: category.nombre,
                fechaRegistro: category.fechaRegistro,
                usuarioIdRegistro: category.usuarioIdRegistro
            }
        })

        return {
            success: true,
            message: "Categoria creada existosamente" 
        }

    } catch (error) {
        return {
            error: error instanceof Error ? error.message : "Error desconocido"
        }
    }
}