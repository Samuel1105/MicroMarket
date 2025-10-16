"use server";
import { prisma } from "@/src/lib/prisma";

// ========== BÚSQUEDA DE CLIENTES ==========
export async function searchClientByCarnet(carnet: string) {
  try {
    const cliente = await prisma.cliente.findFirst({
      where: {
        carnet: carnet,
        estado: 1,
      },
      select: {
        id: true,
        carnet: true,
        nombre: true,
        correo: true,
      },
    });

    return {
      success: true,
      data: cliente,
      exists: !!cliente,
    };
  } catch (error) {
    console.error('Error al buscar cliente:', error);
    return {
      success: false,
      data: null,
      exists: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// ========== REGISTRAR NUEVO CLIENTE ==========
interface CreateClientData {
  carnet: string;
  nombre: string;
  correo: string;
  usuarioIdRegistro: number;
}

export async function createClient(data: CreateClientData) {
  try {
    // Verificar si ya existe
    const existente = await prisma.cliente.findFirst({
      where: { carnet: data.carnet },
    });

    if (existente) {
      return {
        success: false,
        error: 'Ya existe un cliente con este carnet',
      };
    }

    const cliente = await prisma.cliente.create({
      data: {
        carnet: data.carnet,
        nombre: data.nombre,
        correo: data.correo,
        estado: 1,
        fechaRegistro: new Date(),
        usuarioIdRegistro: data.usuarioIdRegistro,
      },
    });

    return {
      success: true,
      data: {
        id: cliente.id,
        carnet: cliente.carnet,
        nombre: cliente.nombre,
        correo: cliente.correo,
      },
    };
  } catch (error) {
    console.error('Error al crear cliente:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// ========== BUSCAR PRODUCTO POR CÓDIGO DE BARRAS ==========
export async function searchProductByBarcode(barcode: string) {
  try {
    const codigoBarras = await prisma.codigoBarrasItem.findUnique({
      where: {
        codigoBarras: barcode,
        estado: 1, // Solo códigos disponibles
      },
      select: {
        id: true,
        codigoBarras: true,
        StockVenta: {
          select: {
            id: true,
            cantidadDisponible: true,
            cantidadUnidadesBase: true,
            precioVenta: true,
            fechaVencimiento: true,
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
      },
    });

    if (!codigoBarras || !codigoBarras.StockVenta) {
      return {
        success: false,
        data: null,
        error: 'Código de barras no encontrado o producto no disponible',
      };
    }

    // Verificar que haya stock disponible
    if (Number(codigoBarras.StockVenta.cantidadDisponible) <= 0) {
      return {
        success: false,
        data: null,
        error: 'Producto sin stock disponible',
      };
    }

    return {
      success: true,
      data: {
        codigoBarrasId: codigoBarras.id,
        codigoBarras: codigoBarras.codigoBarras,
        stockVentaId: codigoBarras.StockVenta.id,
        producto: {
          id: codigoBarras.StockVenta.Producto.id,
          nombre: codigoBarras.StockVenta.Producto.nombre,
          descripcion: codigoBarras.StockVenta.Producto.descripcion,
        },
        unidad: {
          id: codigoBarras.StockVenta.UnidadMedida.id,
          nombre: codigoBarras.StockVenta.UnidadMedida.nombre,
          abreviatura: codigoBarras.StockVenta.UnidadMedida.abreviatura,
        },
        lote: codigoBarras.StockVenta.Lote ? {
          id: codigoBarras.StockVenta.Lote.id,
          numeroLote: codigoBarras.StockVenta.Lote.numeroLote,
        } : null,
        cantidadDisponible: Number(codigoBarras.StockVenta.cantidadDisponible),
        precioVenta: Number(codigoBarras.StockVenta.precioVenta),
        fechaVencimiento: codigoBarras.StockVenta.fechaVencimiento?.toISOString().split('T')[0] || null,
      },
    };
  } catch (error) {
    console.error('Error al buscar por código de barras:', error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// ========== OBTENER STOCK DISPONIBLE PARA VENTA MANUAL ==========
export async function getAvailableProductsForSale() {
  try {
    const stockVenta = await prisma.stockVenta.findMany({
      where: {
        estado: 1,
        cantidadDisponible: {
          gt: 0,
        },
      },
      select: {
        id: true,
        cantidadDisponible: true,
        precioVenta: true,
        fechaVencimiento: true,
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
        CodigoBarrasItem: {
          where: {
            estado: 1,
          },
          select: {
            id: true,
            codigoBarras: true,
          },
        },
      },
      orderBy: {
        fechaRegistro: 'desc',
      },
    });

    const productos = stockVenta.map(stock => ({
      stockVentaId: stock.id,
      producto: {
        id: stock.Producto.id,
        nombre: stock.Producto.nombre,
        descripcion: stock.Producto.descripcion,
      },
      unidad: {
        id: stock.UnidadMedida.id,
        nombre: stock.UnidadMedida.nombre,
        abreviatura: stock.UnidadMedida.abreviatura,
      },
      lote: stock.Lote ? {
        id: stock.Lote.id,
        numeroLote: stock.Lote.numeroLote,
      } : null,
      cantidadDisponible: Number(stock.cantidadDisponible),
      precioVenta: Number(stock.precioVenta),
      fechaVencimiento: stock.fechaVencimiento?.toISOString().split('T')[0] || null,
      codigosBarras: stock.CodigoBarrasItem.map(cb => ({
        id: cb.id,
        codigo: cb.codigoBarras,
      })),
    }));

    return {
      success: true,
      data: productos,
    };
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// ========== PROCESAR VENTA ==========
interface DetalleVentaItem {
  stockVentaId: number;
  codigoBarrasId?: number; // Opcional: si fue por código de barras
  cantidadVendida: number;
  cantidadUnidadesBase: number;
  precioUnitario: number;
  subtotal: number;
  descuento?: number;
  total: number;
}

interface ProcessSaleRequest {
  numeroVenta: string;
  clienteId: number;
  subtotal: number;
  descuento?: number;
  impuestos?: number;
  total: number;
  montoRecibido: number;
  cambio: number;
  metodoPago?: number; // 1 = efectivo, 2 = tarjeta, etc.
  detalles: DetalleVentaItem[];
  usuarioId: number;
}

export async function processSale(request: ProcessSaleRequest) {
  try {
    // Validaciones
    if (!request.clienteId || request.detalles.length === 0) {
      return {
        success: false,
        error: 'Datos de venta incompletos',
      };
    }

    if (request.montoRecibido < request.total) {
      return {
        success: false,
        error: 'El monto recibido es menor al total',
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. CREAR LA VENTA
      const venta = await tx.venta.create({
        data: {
          numeroVenta: request.numeroVenta,
          clienteID: request.clienteId,
          subtotal: request.subtotal,
          descuento: request.descuento || 0,
          impuestos: request.impuestos || 0,
          total: request.total,
          montoRecibido: request.montoRecibido,
          cambio: request.cambio,
          metodoPago: request.metodoPago || 1,
          estado: 1,
          fechaVenta: new Date(),
          usuarioRegistro: request.usuarioId,
        },
      });

      let detallesCreados = 0;
      let codigosActualizados = 0;
      let stocksActualizados = 0;

      // 2. PROCESAR CADA DETALLE
      for (const detalle of request.detalles) {
        // Verificar stock disponible
        const stockVenta = await tx.stockVenta.findUnique({
          where: { id: detalle.stockVentaId },
        });

        if (!stockVenta) {
          throw new Error(`Stock ${detalle.stockVentaId} no encontrado`);
        }

        if (Number(stockVenta.cantidadDisponible) < detalle.cantidadVendida) {
          throw new Error(
            `Stock insuficiente. Disponible: ${stockVenta.cantidadDisponible}, ` +
            `Solicitado: ${detalle.cantidadVendida}`
          );
        }

        // 2.1 CREAR DETALLE DE VENTA
        await tx.detalleVenta.create({
          data: {
            ventaID: venta.id,
            stockVentaID: detalle.stockVentaId,
            codigoBarrasItemID: detalle.codigoBarrasId || null,
            cantidadVendida: detalle.cantidadVendida,
            cantidadUnidadesBase: detalle.cantidadUnidadesBase,
            precioUnitario: detalle.precioUnitario,
            subtotal: detalle.subtotal,
            descuento: detalle.descuento || 0,
            total: detalle.total,
          },
        });
        detallesCreados++;

        // 2.2 ACTUALIZAR STOCK
        const nuevaCantidad = Number(stockVenta.cantidadDisponible) - detalle.cantidadVendida;
        const nuevaCantidadBase = Number(stockVenta.cantidadUnidadesBase) - detalle.cantidadUnidadesBase;

        await tx.stockVenta.update({
          where: { id: detalle.stockVentaId },
          data: {
            cantidadDisponible: nuevaCantidad,
            cantidadUnidadesBase: nuevaCantidadBase,
            // Si se agota, marcar como inactivo
            estado: nuevaCantidad <= 0 ? 2 : 1,
          },
        });
        stocksActualizados++;

        // 2.3 ACTUALIZAR CÓDIGO DE BARRAS (si se usó)
        if (detalle.codigoBarrasId) {
          await tx.codigoBarrasItem.update({
            where: { id: detalle.codigoBarrasId },
            data: {
              estado: 2, // 2 = vendido
            },
          });
          codigosActualizados++;
        }
      }

      return {
        ventaId: venta.id,
        numeroVenta: venta.numeroVenta || '',
        total: Number(venta.total),
        cambio: Number(venta.cambio),
        detallesCreados,
        codigosActualizados,
        stocksActualizados,
      };
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error al procesar venta:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al procesar venta',
    };
  }
}

