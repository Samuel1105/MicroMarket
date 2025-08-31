"use server"

import { prisma } from "@/src/lib/prisma";
import { ProductoUpdateApiData } from "@/src/schema/SchemaProduts";
import { revalidatePath } from "next/cache";

export async function updateProductAction(data: ProductoUpdateApiData) {
    try {
        console.log('🔄 Iniciando actualización de producto...', data);

        const result = await prisma.$transaction(async (tx) => {
            // 1. Actualizar el producto principal
            const productoActualizado = await tx.producto.update({
                where: {
                    id: data.producto.id
                },
                data: {
                    nombre: data.producto.nombre,
                    descripcion: data.producto.descripcion,
                    categoriaID: data.producto.categoriaID,
                    proveedorID: data.producto.proveedorID,
                    unidadBaseID: data.producto.unidadBaseID,
                    fechaActualizacion: new Date(),
                    usuarioActualizacion: data.producto.usuarioActualizacion
                }
            });

            // 2. Eliminar conversiones marcadas para eliminación
            if (data.conversionesEliminadas && data.conversionesEliminadas.length > 0) {
                await tx.conversionUnidad.updateMany({
                    where: {
                        id: {
                            in: data.conversionesEliminadas
                        },
                        productoID: data.producto.id
                    },
                    data: {
                        estado: 0, // Marcar como eliminada en lugar de eliminar físicamente
                        //fechaActualizacion: new Date()
                    }
                });
                console.log(`🗑️ ${data.conversionesEliminadas.length} conversiones marcadas como eliminadas`);
            }

            // 3. Procesar conversiones (actualizar existentes y crear nuevas)
            for (const conversion of data.conversiones) {
                if (conversion.id) {
                    // Actualizar conversión existente
                    await tx.conversionUnidad.update({
                        where: {
                            id: conversion.id,
                            productoID: data.producto.id
                        },
                        data: {
                            unidadOrigenID: conversion.unidadOrigenID,
                            unidadDestinoID: conversion.unidadDestinoID,
                            factorConversion: conversion.factorConversion,
                            precioVentaUnitario: conversion.precioVentaUnitario,
                            estado: conversion.estado,
                            //fechaActualizacion: new Date()
                        }
                    });
                } else {
                    // Crear nueva conversión
                    await tx.conversionUnidad.create({
                        data: {
                            productoID: data.producto.id,
                            unidadOrigenID: conversion.unidadOrigenID,
                            unidadDestinoID: conversion.unidadDestinoID,
                            factorConversion: conversion.factorConversion,
                            precioVentaUnitario: conversion.precioVentaUnitario,
                            estado: conversion.estado,
                            //fechaRegistro: new Date(),
                            //usuarioRegistro: data.producto.usuarioActualizacion
                        }
                    });
                }
            }

            return productoActualizado;
        });

        console.log('✅ Producto actualizado exitosamente:', result.id);
        
        // Revalidar las páginas que muestran productos
        revalidatePath('/Dashboard/Product/List');
        revalidatePath(`/Dashboard/Product/Edit/${data.producto.id}`);
        
        return {
            ok: true,
            data: result,
            message: 'Producto actualizado exitosamente'
        };

    } catch (error) {
        console.error('❌ Error al actualizar producto:', error);
        
        return {
            ok: false,
            error: error instanceof Error ? error.message : 'Error desconocido al actualizar el producto',
            message: 'Error al actualizar el producto'
        };
    }
}