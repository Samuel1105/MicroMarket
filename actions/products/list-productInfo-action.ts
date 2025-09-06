"use server"

import { prisma } from "@/src/lib/prisma"
import { productListSchema, unidadMedidaCreateSchema, unidadMedidaListSchema } from "@/src/schema/SchemaProduts"

export async function unidadMedidaList() {
    try {
        const unidades = await prisma.unidadMedida.findMany({
            where: {
                estado: 1
            },
            select: {
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

export async function ListProduct() {
    try {
        const products = await prisma.producto.findMany({
            where: {
                estado: 1
            },
            select: {
                id: true,
                nombre: true,
                descripcion: true,
                estado: true,
                Categoria: {
                    select: {
                        nombre: true
                    }
                },
                Proveedor: {
                    select: {
                        nombre: true
                    }
                },
                UnidadMedida: {
                    select: {
                        nombre: true,
                        abreviatura: true
                    }
                },
                // Agregar información de stock desde StockVenta
                StockVenta: {
                    where: {
                        estado: 1, // Solo stock activo
                        cantidadDisponible: {
                            gt: 0 // Solo donde hay stock disponible
                        }
                    },
                    select: {
                        cantidadDisponible: true,
                        precioVenta: true,
                        fechaVencimiento: true
                    }
                }
            },
            orderBy: [
                { nombre: 'asc' }
            ]
        })

        // Transformar los datos para calcular totales
        const transformedProducts = products.map(product => ({
            id: product.id,
            nombre: product.nombre,
            descripcion: product.descripcion,
            estado: product.estado,
            Categoria: product.Categoria,
            Proveedor: product.Proveedor,
            UnidadMedida: product.UnidadMedida,
            // Calcular stock total sumando todas las cantidades disponibles
            stockTotal: product.StockVenta.reduce((total, stock) => 
                total + Number(stock.cantidadDisponible), 0
            ),
            // Tomar el precio de venta más reciente o promedio
            precioVenta: product.StockVenta.length > 0 
                ? Number(product.StockVenta[0].precioVenta)
                : undefined,
            // Encontrar la fecha de vencimiento más próxima
            fechaVencimiento: product.StockVenta
                .filter(stock => stock.fechaVencimiento)
                .sort((a, b) => new Date(a.fechaVencimiento!).getTime() - new Date(b.fechaVencimiento!).getTime())
                [0]?.fechaVencimiento?.toISOString() || null
        }))

        const response = productListSchema.safeParse(transformedProducts)
        
        if (response.success) {
            return {
                data: response.data
            }
        } else {
            console.error("Error en validación del schema:", response.error)
            return {
                error: response.error.message
            }
        }
    } catch (error) {
        console.error("Error en ListProduct:", error)
        return {
            error: error instanceof Error ? error.message : "Error desconocido"
        }
    }
}