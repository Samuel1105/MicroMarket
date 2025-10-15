import { notFound } from "next/navigation";
import React from "react";

import EditProductForm from "@/components/product/EditProductForm";
import ProductForm from "@/components/product/ProductForm";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Heading from "@/components/ui/Heading";
import { prisma } from "@/src/lib/prisma";

async function getProductById(id: number) {
  const producto = await prisma.producto.findUnique({
    where: {
      id,
      estado: 1,
    },
    include: {
      ConversionUnidad: {
        where: {
          estado: 1,
        },
        include: {
          UnidadMedida_ConversionUnidad_unidadOrigenIDToUnidadMedida: {
            select: {
              id: true,
              nombre: true,
              abreviatura: true,
            },
          },
          UnidadMedida_ConversionUnidad_unidadDestinoIDToUnidadMedida: {
            select: {
              id: true,
              nombre: true,
              abreviatura: true,
            },
          },
        },
        orderBy: {
          factorConversion: "asc",
        },
      },
      Categoria: {
        select: {
          id: true,
          nombre: true,
        },
      },
      Proveedor: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  });

  if (!producto) {
    notFound();
  }

  // Destructurar para excluir ConversionUnidad
  const { ConversionUnidad, ...productoSinConversion } = producto;

  // Transformar los datos para que coincidan con el tipo esperado
  return {
    ...productoSinConversion,
    conversiones: ConversionUnidad.map((conversion) => ({
      id: conversion.id,
      unidadOrigenID: conversion.unidadOrigenID,
      unidadDestinoID: conversion.unidadDestinoID,
      factorConversion: Number(conversion.factorConversion),
      precioVentaUnitario: Number(conversion.precioVentaUnitario || 0),
      estado: conversion.estado || 1,
      unidadOrigen:
        conversion.UnidadMedida_ConversionUnidad_unidadOrigenIDToUnidadMedida || {
          id: 0,
          nombre: "",
          abreviatura: null,
        },
    })),
  };
}

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const { id } = await params;
  const producto = await getProductById(+id);

  return (
    <ProtectedRoute allowedRoles={[1, 3,4]}>
      <Heading>Editando: {producto.nombre}</Heading>
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Información del producto
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600">
                                <strong>Categoría:</strong> {producto.Categoria.nombre} | 
                                <strong> Proveedor:</strong> {producto.Proveedor.nombre}
                            </p>
                            <p className="text-xs text-blue-500 mt-1">
                                ID: {producto.id} | Unidades configuradas: {producto.conversiones.length}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Activo
                            </span>
                        </div>
                    </div>
                </div> */}

        <div className="w-full pt-5">
          <EditProductForm producto={producto}>
            <ProductForm producto={producto} />
          </EditProductForm>
        </div>
      </div>
    </ProtectedRoute>
  );
}
