"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import {
  productoCompleteFormSchema,
  productoCompleteEditFormSchema,
  ProductoCompleteForm,
  ProductoCompleteEditForm,
  ProductoApiData,
  ProductoUpdateApiData,
  ProductoCompleto,
} from "@/src/schema/SchemaProduts";
import { createProductAction } from "@/actions/products/create-product-action";
// import { updateProductAction } from '@/actions/products/update-product-action'; // Necesitarás crear esta acción
import { useAuth } from "@/app/context/AuthContext";
import { updateProductAction } from "@/actions/products/update-product-action";

interface UseProductFormProps {
  producto?: ProductoCompleto; // Si está presente, es modo edición
  isEditMode?: boolean;
}

export const useProductForm = ({
  producto,
  isEditMode = !!producto,
}: UseProductFormProps = {}) => {
  const router = useRouter();
  const { user } = useAuth();

  // Determinar valores por defecto según el modo
  const getDefaultValues = () => {
    if (isEditMode && producto) {
      return {
        id: producto.id,
        nombre: producto.nombre,
        descripcion: producto.descripcion || "",
        categoriaID: producto.categoriaID.toString(),
        proveedorID: producto.proveedorID.toString(),
        conversiones: producto.conversiones.map((conversion, index) => ({
          id: conversion.id,
          unidadOrigenID: conversion.unidadOrigenID.toString(),
          factorConversion: conversion.factorConversion,
          precioVentaUnitario: conversion.precioVentaUnitario,
          esUnidadBase: index === 0,
          estado: conversion.estado,
        })),
      };
    }

    // Valores por defecto para creación
    return {
      nombre: "",
      descripcion: "",
      categoriaID: "",
      proveedorID: "",
      requiereNumeroSerie: false,
      conversiones: [
        {
          unidadOrigenID: "",
          factorConversion: 1,
          precioVentaUnitario: 0,
          esUnidadBase: true,
        },
      ],
    };
  };

  const methods = useForm<ProductoCompleteForm | ProductoCompleteEditForm>({
    resolver: zodResolver(
      isEditMode ? productoCompleteEditFormSchema : productoCompleteFormSchema,
    ),
    defaultValues: getDefaultValues(),
    mode: "onChange",
  });

  // Procesamiento para crear producto
  const processCreateData = async (data: ProductoCompleteForm) => {
    try {
      console.log("🔄 Creando producto...");

      const apiData: ProductoApiData = {
        producto: {
          nombre: data.nombre.trim(),
          descripcion: data.descripcion?.trim(),
          categoriaID: parseInt(data.categoriaID),
          proveedorID: parseInt(data.proveedorID),
          unidadBaseID: parseInt(data.conversiones[0].unidadOrigenID),

          usuarioRegistro: user?.id || 1,
        },
        conversiones: data.conversiones
          .filter((c) => c.unidadOrigenID && c.factorConversion > 0)
          .map((c, index) => ({
            unidadOrigenID: parseInt(c.unidadOrigenID),
            unidadDestinoID:
              index === 0
                ? parseInt(c.unidadOrigenID)
                : parseInt(data.conversiones[0].unidadOrigenID),
            factorConversion: c.factorConversion,
            precioVentaUnitario: c.precioVentaUnitario,
            estado: 1,
          })),
      };

      const result = await createProductAction(apiData);

      if (result.ok) {
        toast.success("Producto creado exitosamente");
        router.push("/Dashboard/Product/List");
      } else {
        //throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error("❌ Error al crear producto:", error);
      toast.error("Error al crear el producto. Por favor, intenta nuevamente.");
    }
  };

  // Procesamiento para actualizar producto
  const processUpdateData = async (data: ProductoCompleteEditForm) => {
    try {
      console.log("🔄 Actualizando producto...");

      if (!data.id) {
        throw new Error("ID del producto no encontrado");
      }

      // Identificar conversiones eliminadas comparando con las originales
      const conversionesOriginales = producto?.conversiones || [];
      const conversionesActuales = data.conversiones.filter((c) => c.id);
      const conversionesEliminadas = conversionesOriginales
        .filter(
          (original) =>
            !conversionesActuales.find((actual) => actual.id === original.id),
        )
        .map((c) => c.id);

      const apiData: ProductoUpdateApiData = {
        producto: {
          id: data.id,
          nombre: data.nombre.trim(),
          descripcion: data.descripcion?.trim(),
          categoriaID: parseInt(data.categoriaID),
          proveedorID: parseInt(data.proveedorID),
          unidadBaseID: parseInt(data.conversiones[0].unidadOrigenID),

          usuarioActualizacion: user?.id || 1,
        },
        conversiones: data.conversiones
          .filter((c) => c.unidadOrigenID && c.factorConversion > 0)
          .map((c, index) => ({
            id: c.id, // Puede ser undefined para nuevas conversiones
            unidadOrigenID: parseInt(c.unidadOrigenID),
            unidadDestinoID:
              index === 0
                ? parseInt(c.unidadOrigenID)
                : parseInt(data.conversiones[0].unidadOrigenID),
            factorConversion: c.factorConversion,
            precioVentaUnitario: c.precioVentaUnitario,
            estado: c.estado || 1,
          })),
        conversionesEliminadas:
          conversionesEliminadas.length > 0
            ? conversionesEliminadas
            : undefined,
      };

      console.log(apiData);

      // Aquí necesitarás crear la acción updateProductAction
      const result = await updateProductAction(apiData);

      if (result.ok) {
        toast.success("Producto actualizado exitosamente");
      }

      // Simulación temporal
      // console.log('📊 Datos para actualizar:', apiData);
      router.push("/Dashboard/Product/List");
    } catch (error) {
      console.error("❌ Error al actualizar producto:", error);
      toast.error(
        "Error al actualizar el producto. Por favor, intenta nuevamente.",
      );
    }
  };

  const onSubmit = methods.handleSubmit((data) => {
    if (isEditMode) {
      processUpdateData(data as ProductoCompleteEditForm);
    } else {
      processCreateData(data as ProductoCompleteForm);
    }
  });

  return {
    ...methods,
    onSubmit,
    isEditMode,
    producto,
  };
};
