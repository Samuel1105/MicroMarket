"use server";
import { ANULACION_COMPRA, ESTADO_ACTIVO, ESTADO_ANULADO } from "@/src/lib/anulaciones";
import { cargarAnulaciones } from "@/src/lib/anulaciones-datos";
import { ESTADO_COMPRA_POR_RECIBIR } from "@/src/lib/compras";
import { prisma } from "@/src/lib/prisma";
import { MOV_AJUSTE_ALMACEN, MOV_AJUSTE_ESTANTE, MOV_SALIDA_ESTANTE } from "@/src/lib/stock-almacen";

export async function getPurchaseHistory() {
  try {
    const compras = await prisma.compra.findMany({
      where: {
        estado: { in: [ESTADO_ACTIVO, ESTADO_ANULADO, ESTADO_COMPRA_POR_RECIBIR] }, // recibidas, anuladas y por recibir
      },
      select: {
        id: true,
        numeroCompra: true,
        fechaRegistro: true,
        subtotal: true,
        descuento: true,
        total: true,
        estado: true,
        usuarioIdRegistro: true,
        Proveedor: {
          select: {
            id: true,
            nombre: true,
          },
        },
        DetalleCompra: {
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
              select: {
                id: true,
                numeroLote: true,
                fechaVencimiento: true,
                cantidadInicialUnidadesBase: true,
                // ¿Ya se sacó algo de este lote al estante o se ajustó? Entonces la compra ya no se puede anular
                MovimientoAlmacen: {
                  where: { tipoMovimiento: { in: [MOV_SALIDA_ESTANTE, MOV_AJUSTE_ALMACEN, MOV_AJUSTE_ESTANTE] } },
                  select: { id: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: {
        fechaRegistro: 'desc',
      },
    });

    const anulaciones = await cargarAnulaciones(ANULACION_COMPRA, compras.filter(c => c.estado === ESTADO_ANULADO).map(c => c.id));

    // Quién registró la compra y quién validó su recepción (el ingreso al almacén)
    const ingresos = await prisma.movimientoAlmacen.findMany({
      where: { tipoMovimiento: 1, tipoReferencia: 1, referenciaID: { in: compras.map(c => c.id) } },
      select: { referenciaID: true, usuarioIdRegistro: true, fechaRegistro: true },
      orderBy: { id: "asc" },
    });
    const idsPersonas = Array.from(new Set([...compras.map(c => c.usuarioIdRegistro), ...ingresos.map(i => i.usuarioIdRegistro)]));
    const personas = idsPersonas.length
      ? await prisma.persona.findMany({ where: { id: { in: idsPersonas } }, select: { id: true, primerNombre: true, apellidoPaterno: true } })
      : [];
    const nombres = new Map(personas.map(p => [p.id, `${p.primerNombre} ${p.apellidoPaterno}`]));
    const recepcion = new Map<number, { usuario: string; fecha: string | null }>();

    for (const i of ingresos) {
      if (i.referenciaID && !recepcion.has(i.referenciaID)) {
        recepcion.set(i.referenciaID, { usuario: nombres.get(i.usuarioIdRegistro) ?? `Usuario ${i.usuarioIdRegistro}`, fecha: i.fechaRegistro?.toISOString() ?? null });
      }
    }

    // Transformar los datos para una estructura más limpia
    const comprasTransformadas = compras.map(compra => ({
      id: compra.id,
      registradaPor: nombres.get(compra.usuarioIdRegistro) ?? `Usuario ${compra.usuarioIdRegistro}`,
      fechaHora: compra.fechaRegistro?.toISOString() ?? null,
      recepcion: recepcion.get(compra.id) ?? null,
      anulacion: anulaciones.get(compra.id) ?? null,
      bloqueada: compra.DetalleCompra.some(d => d.Lote.some(l => l.MovimientoAlmacen.length > 0)),
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