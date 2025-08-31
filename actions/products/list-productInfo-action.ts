"use server"

import { prisma } from "@/src/lib/prisma"
import { unidadMedidaCreateSchema, unidadMedidaListSchema } from "@/src/schema/SchemaProduts"

export async function unidadMedidaList() {
    try {
        const unidades = await prisma.unidadMedida.findMany({
            where:{
                estado:1
            },
            select:{
                id: true,
                nombre: true,
                abreviatura: true
            }
        })

        const response = unidadMedidaListSchema.safeParse(unidades)
        if (response.success) {
            return {
                data: response.data
            }
        } else {
            return {
                error: response.error.message
            }
        }
    } catch (error) {
        return {
            error: error instanceof Error ? error.message : "Error desconocido"
        }
    }
}


export async function createUnidadMedida(data: { nombre: string; abreviatura: string }) {
    try {
        // Validar los datos de entrada
        const validatedData = unidadMedidaCreateSchema.safeParse(data)
        
        if (!validatedData.success) {
            return {
                error: validatedData.error.errors[0]?.message || "Datos inválidos"
            }
        }

        // Verificar si ya existe una unidad con el mismo nombre o abreviatura
        const existingUnit = await prisma.unidadMedida.findFirst({
            where: {
                OR: [
                    { nombre: validatedData.data.nombre },
                    { abreviatura: validatedData.data.abreviatura }
                ],
                estado: 1
            }
        })

        if (existingUnit) {
            return {
                error: "Ya existe una unidad con ese nombre o abreviatura"
            }
        }

        // Crear la nueva unidad
        await prisma.unidadMedida.create({
            data: {
                nombre: validatedData.data.nombre,
                abreviatura: validatedData.data.abreviatura,
                estado: 1
            },
            select: {
                id: true,
                nombre: true,
                abreviatura: true
            }
        })
        return {
            message: "Unidad Creado Existosamente",
            success: true
        }
        
        

    } catch (error) {
        console.error('Error creating unidad medida:', error)
        return {
            error: error instanceof Error ? error.message : "Error desconocido al crear la unidad"
        }
    }
}