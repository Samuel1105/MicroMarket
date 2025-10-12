"use server";
import { prisma } from "@/src/lib/prisma";

export async function getProductsBySupplier(supplierId: number) {
  try {
    const products = await prisma.producto.findMany({
      where: {
        proveedorID: supplierId,
        estado: 1, // Solo productos activos
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        // Solo las conversiones de unidades con precios
        ConversionUnidad: {
          where: {
            estado: 1, // Solo conversiones activas
          },
          select: {
            id: true,
            unidadOrigenID: true,
            unidadDestinoID: true,
            factorConversion: true,
            precioVentaUnitario: true,
            // Unidad origen (la unidad base)
            UnidadMedida_ConversionUnidad_unidadOrigenIDToUnidadMedida: {
              select: {
                id: true,
                nombre: true,
                abreviatura: true,
              }
            },
            // Unidad destino (la unidad de venta/conversión)
            UnidadMedida_ConversionUnidad_unidadDestinoIDToUnidadMedida: {
              select: {
                id: true,
                nombre: true,
                abreviatura: true,
              }
            }
          },
          orderBy: {
            factorConversion: 'asc' // Ordenar por factor (base primero)
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    // Transformar los datos para una estructura más limpia
    const transformedProducts = products.map(producto => ({
      id: producto.id,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      unidades: producto.ConversionUnidad.map(conversion => {
        const factor = Number(conversion.factorConversion);
        const esUnidadBase = factor === 1 && 
          conversion.unidadOrigenID === conversion.unidadDestinoID;
        
        // La unidad que se muestra es siempre la unidad ORIGEN
        // Porque es la unidad en la que se vende/compra
        const unidadMostrar = conversion.UnidadMedida_ConversionUnidad_unidadOrigenIDToUnidadMedida;
        
        return {
          id: conversion.id,
          unidadId: unidadMostrar.id,
          nombre: unidadMostrar.nombre,
          abreviatura: unidadMostrar.abreviatura,
          factor: factor,
          precio: conversion.precioVentaUnitario ? Number(conversion.precioVentaUnitario) : 0,
          esUnidadBase: esUnidadBase,
         
        };
      })
    }));

    return {
      data: transformedProducts,
    };
  } catch (error) {
    console.error("Error al obtener productos por proveedor:", error);
    return {
      
      data: [],
      
    };
  }
}