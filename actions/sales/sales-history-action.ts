"use server";
import { prisma } from "@/src/lib/prisma";

// Obtener historial completo de ventas
export async function getSalesHistory() {
  try {
    const ventas = await prisma.venta.findMany({
      where: {
        estado: 1, // Solo ventas activas/completadas
      },
      select: {
        id: true,
        numeroVenta: true,
        fechaVenta: true,
        subtotal: true,
        descuento: true,
        impuestos: true,
        total: true,
        montoRecibido: true,
        cambio: true,
        metodoPago: true,
        estado: true,
        // Cliente
        Cliente: {
          select: {
            id: true,
            nombre: true,
            carnet: true,
            correo: true,
          },
        },
        // Detalles de venta
        DetalleVenta: {
          select: {
            id: true,
            cantidadVendida: true,
            cantidadUnidadesBase: true,
            precioUnitario: true,
            subtotal: true,
            descuento: true,
            total: true,
            // Stock vendido
            StockVenta: {
              select: {
                id: true,
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
                  select: {
                    id: true,
                    numeroLote: true,
                  },
                },
              },
            },
            // Código de barras usado
            CodigoBarrasItem: {
              select: {
                id: true,
                codigoBarras: true,
              },
            },
          },
        },
      },
      orderBy: {
        fechaVenta: 'desc',
      },
    });

    // Transformar datos
    const ventasTransformadas = ventas.map(venta => ({
      id: venta.id,
      numeroVenta: venta.numeroVenta || 'SIN NÚMERO',
      fecha: venta.fechaVenta?.toISOString() || new Date().toISOString(),
      cliente: {
        id: venta.Cliente.id,
        nombre: venta.Cliente.nombre,
        carnet: venta.Cliente.carnet,
        correo: venta.Cliente.correo,
      },
      subtotal: Number(venta.subtotal),
      descuento: Number(venta.descuento || 0),
      impuestos: Number(venta.impuestos || 0),
      total: Number(venta.total),
      montoRecibido: Number(venta.montoRecibido),
      cambio: Number(venta.cambio),
      metodoPago: venta.metodoPago || 1,
      estado: venta.estado || 1,
      detalles: venta.DetalleVenta.map(detalle => ({
        id: detalle.id,
        producto: detalle.StockVenta.Producto.nombre,
        productoId: detalle.StockVenta.Producto.id,
        descripcion: detalle.StockVenta.Producto.descripcion,
        unidad: `${detalle.StockVenta.UnidadMedida.nombre} (${detalle.StockVenta.UnidadMedida.abreviatura || 'N/A'})`,
        unidadId: detalle.StockVenta.UnidadMedida.id,
        lote: detalle.StockVenta.Lote ? detalle.StockVenta.Lote.numeroLote : 'SIN LOTE',
        loteId: detalle.StockVenta.Lote?.id || null,
        cantidad: Number(detalle.cantidadVendida),
        cantidadUnidadesBase: Number(detalle.cantidadUnidadesBase),
        precioUnitario: Number(detalle.precioUnitario),
        subtotal: Number(detalle.subtotal),
        descuento: Number(detalle.descuento || 0),
        total: Number(detalle.total),
        codigoBarras: detalle.CodigoBarrasItem?.codigoBarras || null,
        codigoBarrasId: detalle.CodigoBarrasItem?.id || null,
      })),
    }));

    return {
      success: true,
      data: ventasTransformadas,
    };
  } catch (error) {
    console.error('Error al obtener historial de ventas:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// Obtener una venta específica por ID
export async function getSaleById(saleId: number) {
  try {
    const venta = await prisma.venta.findUnique({
      where: {
        id: saleId,
      },
      select: {
        id: true,
        numeroVenta: true,
        fechaVenta: true,
        subtotal: true,
        descuento: true,
        impuestos: true,
        total: true,
        montoRecibido: true,
        cambio: true,
        metodoPago: true,
        estado: true,
        Cliente: {
          select: {
            id: true,
            nombre: true,
            carnet: true,
            correo: true,
          },
        },
        DetalleVenta: {
          select: {
            id: true,
            cantidadVendida: true,
            cantidadUnidadesBase: true,
            precioUnitario: true,
            subtotal: true,
            descuento: true,
            total: true,
            StockVenta: {
              select: {
                id: true,
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
                  select: {
                    id: true,
                    numeroLote: true,
                    fechaVencimiento: true,
                  },
                },
              },
            },
            CodigoBarrasItem: {
              select: {
                id: true,
                codigoBarras: true,
              },
            },
          },
        },
      },
    });

    if (!venta) {
      return {
        success: false,
        data: null,
        error: 'Venta no encontrada',
      };
    }

    const ventaTransformada = {
      id: venta.id,
      numeroVenta: venta.numeroVenta || 'SIN NÚMERO',
      fecha: venta.fechaVenta?.toISOString() || new Date().toISOString(),
      cliente: {
        id: venta.Cliente.id,
        nombre: venta.Cliente.nombre,
        carnet: venta.Cliente.carnet,
        correo: venta.Cliente.correo,
      },
      subtotal: Number(venta.subtotal),
      descuento: Number(venta.descuento || 0),
      impuestos: Number(venta.impuestos || 0),
      total: Number(venta.total),
      montoRecibido: Number(venta.montoRecibido),
      cambio: Number(venta.cambio),
      metodoPago: venta.metodoPago || 1,
      estado: venta.estado || 1,
      detalles: venta.DetalleVenta.map(detalle => ({
        id: detalle.id,
        producto: detalle.StockVenta.Producto.nombre,
        productoId: detalle.StockVenta.Producto.id,
        descripcion: detalle.StockVenta.Producto.descripcion,
        unidad: `${detalle.StockVenta.UnidadMedida.nombre} (${detalle.StockVenta.UnidadMedida.abreviatura || 'N/A'})`,
        unidadId: detalle.StockVenta.UnidadMedida.id,
        lote: detalle.StockVenta.Lote ? detalle.StockVenta.Lote.numeroLote : 'SIN LOTE',
        loteId: detalle.StockVenta.Lote?.id || null,
        fechaVencimiento: detalle.StockVenta.Lote?.fechaVencimiento?.toISOString().split('T')[0] || null,
        cantidad: Number(detalle.cantidadVendida),
        cantidadUnidadesBase: Number(detalle.cantidadUnidadesBase),
        precioUnitario: Number(detalle.precioUnitario),
        subtotal: Number(detalle.subtotal),
        descuento: Number(detalle.descuento || 0),
        total: Number(detalle.total),
        codigoBarras: detalle.CodigoBarrasItem?.codigoBarras || null,
        codigoBarrasId: detalle.CodigoBarrasItem?.id || null,
      })),
    };

    return {
      success: true,
      data: ventaTransformada,
    };
  } catch (error) {
    console.error('Error al obtener venta:', error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// Obtener ventas por rango de fechas
export async function getSalesByDateRange(startDate: Date, endDate: Date) {
  try {
    const ventas = await prisma.venta.findMany({
      where: {
        estado: 1,
        fechaVenta: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        numeroVenta: true,
        fechaVenta: true,
        total: true,
        Cliente: {
          select: {
            nombre: true,
            carnet: true,
          },
        },
      },
      orderBy: {
        fechaVenta: 'desc',
      },
    });

    const ventasTransformadas = ventas.map(venta => ({
      id: venta.id,
      numeroVenta: venta.numeroVenta || 'SIN NÚMERO',
      fecha: venta.fechaVenta?.toISOString() || '',
      total: Number(venta.total),
      cliente: venta.Cliente.nombre,
      carnet: venta.Cliente.carnet,
    }));

    return {
      success: true,
      data: ventasTransformadas,
      totalVentas: ventasTransformadas.length,
      montoTotal: ventasTransformadas.reduce((sum, v) => sum + v.total, 0),
    };
  } catch (error) {
    console.error('Error al obtener ventas por fecha:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// Obtener ventas por cliente
export async function getSalesByClient(clientId: number) {
  try {
    const ventas = await prisma.venta.findMany({
      where: {
        clienteID: clientId,
        estado: 1,
      },
      select: {
        id: true,
        numeroVenta: true,
        fechaVenta: true,
        total: true,
        metodoPago: true,
        DetalleVenta: {
          select: {
            StockVenta: {
              select: {
                Producto: {
                  select: {
                    nombre: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        fechaVenta: 'desc',
      },
    });

    const ventasTransformadas = ventas.map(venta => ({
      id: venta.id,
      numeroVenta: venta.numeroVenta || '',
      fecha: venta.fechaVenta?.toISOString() || '',
      total: Number(venta.total),
      metodoPago: venta.metodoPago || 1,
      productos: venta.DetalleVenta.map(d => d.StockVenta.Producto.nombre),
    }));

    return {
      success: true,
      data: ventasTransformadas,
      totalCompras: ventasTransformadas.length,
      montoTotal: ventasTransformadas.reduce((sum, v) => sum + v.total, 0),
    };
  } catch (error) {
    console.error('Error al obtener ventas del cliente:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// Obtener estadísticas de ventas
export async function getSalesStatistics() {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Ventas de hoy
    const ventasHoy = await prisma.venta.findMany({
      where: {
        estado: 1,
        fechaVenta: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        total: true,
      },
    });

    // Total general
    const totalGeneral = await prisma.venta.aggregate({
      where: { estado: 1 },
      _sum: { total: true },
      _count: { id: true },
    });

    // Productos más vendidos
    const productosMasVendidos = await prisma.detalleVenta.groupBy({
      by: ['stockVentaID'],
      _sum: {
        cantidadVendida: true,
      },
      orderBy: {
        _sum: {
          cantidadVendida: 'desc',
        },
      },
      take: 10,
    });

    return {
      success: true,
      data: {
        ventasHoy: ventasHoy.length,
        montoHoy: ventasHoy.reduce((sum, v) => sum + Number(v.total), 0),
        totalVentas: totalGeneral._count.id,
        montoTotal: Number(totalGeneral._sum.total || 0),
        productosMasVendidos: productosMasVendidos.length,
      },
    };
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

