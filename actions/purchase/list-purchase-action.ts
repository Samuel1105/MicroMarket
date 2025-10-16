"use server";
import { prisma } from "@/src/lib/prisma";

export async function getPurchaseHistory() {
  try {
    const compras = await prisma.compra.findMany({
      where: {
        estado: 1, // Solo compras activas
      },
      select: {
        id: true,
        numeroCompra: true,
        fechaRegistro: true,
        subtotal: true,
        descuento: true,
        total: true,
        estado: true,
        Proveedor: {
          select: {
            id: true,
            nombre: true,
          },
        },
        DetalleCompra: {
          where: {
            estado: 1,
          },
          select: {
            id: true,
            cantidadComprada: true,
            precioUnitario: true,
            subtotal: true,
            descuento: true,
            total: true,
            Producto: {
              select: {
                id: true,
                nombre: true,
              },
            },
            UnidadMedida: {
              select: {
                id: true,
                nombre: true,
                abreviatura: true,
              },
            },
            Lote: {
              where: {
                estado: 1,
              },
              select: {
                id: true,
                numeroLote: true,
                fechaVencimiento: true,
                cantidadInicialUnidadesBase: true,
              },
            },
          },
        },
      },
      orderBy: {
        fechaRegistro: 'desc',
      },
    });

    // Transformar los datos para una estructura más limpia
    const comprasTransformadas = compras.map(compra => ({
      id: compra.id,
      numeroCompra: compra.numeroCompra || 'SIN NÚMERO',
      fecha: compra.fechaRegistro?.toISOString().split('T')[0] || '',
      proveedor: {
        id: compra.Proveedor.id,
        nombre: compra.Proveedor.nombre,
      },
      subtotal: Number(compra.subtotal),
      descuento: Number(compra.descuento || 0),
      total: Number(compra.total),
      estado: compra.estado || 1,
      detalles: compra.DetalleCompra.map(detalle => ({
        id: detalle.id,
        producto: detalle.Producto.nombre,
        productoId: detalle.Producto.id,
        unidad: `${detalle.UnidadMedida.nombre} (${detalle.UnidadMedida.abreviatura || 'N/A'})`,
        unidadId: detalle.UnidadMedida.id,
        cantidad: Number(detalle.cantidadComprada),
        precioUnitario: Number(detalle.precioUnitario),
        subtotal: Number(detalle.subtotal),
        descuento: Number(detalle.descuento || 0),
        total: Number(detalle.total),
        lote: detalle.Lote.length > 0 ? detalle.Lote[0].numeroLote : 'SIN LOTE',
        loteId: detalle.Lote.length > 0 ? detalle.Lote[0].id : null,
        fechaVencimiento: detalle.Lote.length > 0 && detalle.Lote[0].fechaVencimiento 
          ? detalle.Lote[0].fechaVencimiento.toISOString().split('T')[0] 
          : null,
        cantidadUnidadesBase: detalle.Lote.length > 0 
          ? Number(detalle.Lote[0].cantidadInicialUnidadesBase) 
          : 0,
      })),
    }));

    return {
      success: true,
      data: comprasTransformadas,
    };
  } catch (error) {
    console.error('Error al obtener historial de compras:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// Action para obtener una compra específica por ID No se usa aun
export async function getPurchaseById(purchaseId: number) {
  try {
    const compra = await prisma.compra.findUnique({
      where: {
        id: purchaseId,
      },
      select: {
        id: true,
        numeroCompra: true,
        fechaRegistro: true,
        subtotal: true,
        descuento: true,
        total: true,
        estado: true,
        Proveedor: {
          select: {
            id: true,
            nombre: true,
            celular: true,
            correo: true,
            direccion: true,
          },
        },
        DetalleCompra: {
          where: {
            estado: 1,
          },
          select: {
            id: true,
            cantidadComprada: true,
            precioUnitario: true,
            subtotal: true,
            descuento: true,
            total: true,
            Producto: {
              select: {
                id: true,
                nombre: true,
                descripcion: true,
              },
            },
            UnidadMedida: {
              select: {
                id: true,
                nombre: true,
                abreviatura: true,
              },
            },
            Lote: {
              where: {
                estado: 1,
              },
              select: {
                id: true,
                numeroLote: true,
                fechaVencimiento: true,
                cantidadInicialUnidadesBase: true,
              },
            },
          },
        },
      },
    });

    if (!compra) {
      return {
        success: false,
        data: null,
        error: 'Compra no encontrada',
      };
    }

    const compraTransformada = {
      id: compra.id,
      numeroCompra: compra.numeroCompra || 'SIN NÚMERO',
      fecha: compra.fechaRegistro?.toISOString().split('T')[0] || '',
      proveedor: {
        id: compra.Proveedor.id,
        nombre: compra.Proveedor.nombre,
        celular: compra.Proveedor.celular,
        correo: compra.Proveedor.correo,
        direccion: compra.Proveedor.direccion,
      },
      subtotal: Number(compra.subtotal),
      descuento: Number(compra.descuento || 0),
      total: Number(compra.total),
      estado: compra.estado || 1,
      detalles: compra.DetalleCompra.map(detalle => ({
        id: detalle.id,
        producto: detalle.Producto.nombre,
        productoId: detalle.Producto.id,
        descripcion: detalle.Producto.descripcion,
        unidad: `${detalle.UnidadMedida.nombre} (${detalle.UnidadMedida.abreviatura || 'N/A'})`,
        unidadId: detalle.UnidadMedida.id,
        cantidad: Number(detalle.cantidadComprada),
        precioUnitario: Number(detalle.precioUnitario),
        subtotal: Number(detalle.subtotal),
        descuento: Number(detalle.descuento || 0),
        total: Number(detalle.total),
        lote: detalle.Lote.length > 0 ? detalle.Lote[0].numeroLote : 'SIN LOTE',
        loteId: detalle.Lote.length > 0 ? detalle.Lote[0].id : null,
        fechaVencimiento: detalle.Lote.length > 0 && detalle.Lote[0].fechaVencimiento 
          ? detalle.Lote[0].fechaVencimiento.toISOString().split('T')[0] 
          : null,
        cantidadUnidadesBase: detalle.Lote.length > 0 
          ? Number(detalle.Lote[0].cantidadInicialUnidadesBase) 
          : 0,
      })),
    };

    return {
      success: true,
      data: compraTransformada,
    };
  } catch (error) {
    console.error('Error al obtener compra:', error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}