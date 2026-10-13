"use server";
import { prisma } from "@/src/lib/prisma";
import { cerrarAvisosResueltos } from "@/src/lib/notifications";
import { getBoliviaTime } from "@/src/utils/date";
import { ESTADO_COMPRA_POR_RECIBIR } from "@/src/lib/compras";
import { CreatePurchaseRequest } from "@/src/schema/SchemaPurchase";

interface PurchaseResponse {
  success: boolean;
  data?: {
    compraId: number;
    numeroCompra: string;
    total: number;
    detallesCreados: number;
    lotesCreados: number;
    movimientosCreados: number;
  };
  error?: string;
}

export async function createPurchaseAction(
  purchaseData: CreatePurchaseRequest
): Promise<PurchaseResponse> {
  try {
    // Validaciones iniciales
    if (!purchaseData.proveedorID || purchaseData.detalles.length === 0) {
      return {
        success: false,
        error: "Datos de compra incompletos",
      };
    }

    // Usar transacción para asegurar integridad de datos
    const result = await prisma.$transaction(async (tx) => {
      // 1. CREAR LA COMPRA
      const compra = await tx.compra.create({
        data: {
          numeroCompra: purchaseData.numeroCompra,
          proveedorID: purchaseData.proveedorID,
          subtotal: purchaseData.subtotal,
          descuento: purchaseData.descuento || 0,
          total: purchaseData.total,
          usuarioIdRegistro: purchaseData.usuarioIdRegistro,
          // Paso 1 de 2: la compra queda "por recibir" hasta que Almacén valide lo que llegó
          estado: ESTADO_COMPRA_POR_RECIBIR,
          fechaRegistro: getBoliviaTime(),
        },
      });

      let detallesCreados = 0;
      let lotesCreados = 0;
      let movimientosCreados = 0;

      // 2. PROCESAR CADA DETALLE DE COMPRA
      for (const detalle of purchaseData.detalles) {
        // 2.1 CREAR DETALLE DE COMPRA
        const detalleCompra = await tx.detalleCompra.create({
          data: {
            compraID: compra.id,
            productoID: detalle.productoID,
            unidadMedidaID: detalle.unidadMedidaID,
            cantidadComprada: detalle.cantidadComprada,
            precioUnitario: detalle.precioUnitario,
            subtotal: detalle.subtotal,
            descuento: detalle.descuento || 0,
            total: detalle.total,
            estado: 1,
          },
        });
        detallesCreados++;

        // 2.2 LOTE PREVISTO (por recibir): todavía no cuenta como stock. Almacén lo activa al validar la
        // recepción (ahí se crea también el movimiento de ingreso).
        await tx.lote.create({
          data: {
            numeroLote: detalle.lote.numeroLote,
            productoID: detalle.lote.productoID,
            detalleCompraID: detalleCompra.id,
            fechaVencimiento: detalle.lote.fechaVencimiento,
            cantidadInicialUnidadesBase: detalle.lote.cantidadInicialUnidadesBase,
            estado: ESTADO_COMPRA_POR_RECIBIR,
            fechaRegistro: getBoliviaTime(),
            usuarioIdRegistro: detalle.lote.usuarioIdRegistro,
          },
        });
        lotesCreados++;

        // // 2.4 CREAR/ACTUALIZAR STOCK DE VENTA
        // // Buscar si ya existe stock para este producto, lote y unidad
        // const stockExistente = await tx.stockVenta.findFirst({
        //   where: {
        //     productoID: detalle.productoID,
        //     loteID: lote.id,
        //     unidadMedidaID: detalle.unidadMedidaID,
        //     estado: 1,
        //   },
        // });

        // if (stockExistente) {
        //   // Actualizar stock existente
        //   await tx.stockVenta.update({
        //     where: { id: stockExistente.id },
        //     data: {
        //       cantidadDisponible: {
        //         increment: detalle.cantidadComprada,
        //       },
        //       cantidadUnidadesBase: {
        //         increment: detalle.lote.cantidadInicialUnidadesBase,
        //       },
        //     },
        //   });
        // } else {
        //   // Crear nuevo registro de stock
        //   // Obtener la conversión para determinar el precio de venta
        //   const conversion = await tx.conversionUnidad.findFirst({
        //     where: {
        //       productoID: detalle.productoID,
        //       unidadOrigenID: detalle.unidadMedidaID,
        //       estado: 1,
        //     },
        //   });

        //   await tx.stockVenta.create({
        //     data: {
        //       productoID: detalle.productoID,
        //       loteID: lote.id,
        //       unidadMedidaID: detalle.unidadMedidaID,
        //       cantidadDisponible: detalle.cantidadComprada,
        //       cantidadUnidadesBase: detalle.lote.cantidadInicialUnidadesBase,
        //       precioVenta: conversion?.precioVentaUnitario || detalle.precioUnitario,
        //       fechaVencimiento: detalle.lote.fechaVencimiento,
        //       estado: 1,
        //       fechaRegistro: new Date(),
        //       usuarioRegistro: purchaseData.usuarioIdRegistro,
        //     },
        //   });
        // }
      }

      return {
        compraId: compra.id,
        numeroCompra: compra.numeroCompra || "",
        total: Number(compra.total),
        detallesCreados,
        lotesCreados,
        movimientosCreados,
      };
    });

    // Si la compra salió de una solicitud, esa solicitud queda confirmada
    if (purchaseData.solicitudID) {
      await prisma.solicitudCompra.updateMany({
        where: { id: purchaseData.solicitudID, estado: 0 },
        data: { estado: 1, compraID: result.compraId, fechaCierre: getBoliviaTime() },
      });
    }

    // Lo que se compró ya no necesita el aviso "comprar"
    await cerrarAvisosResueltos(purchaseData.detalles.map((d) => d.productoID));

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error al crear la compra:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al crear la compra",
    };
  }
}