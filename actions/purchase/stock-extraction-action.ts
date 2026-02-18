"use server";
import { prisma } from "@/src/lib/prisma";
import { getBoliviaTime } from "@/src/utils/date";

// Obtener productos disponibles en el almacén (de las compras)
export async function getAvailableStockForExtraction() {
  try {
    const lotes = await prisma.lote.findMany({
      where: {
        estado: 1,
      },
      select: {
        id: true,
        numeroLote: true,
        fechaVencimiento: true,
        cantidadInicialUnidadesBase: true,
        Producto: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            UnidadMedida: {
              select: {
                id: true,
                nombre: true,
                abreviatura: true,
              }
            },
            ConversionUnidad: {
              where: {
                estado: 1,
              },
              select: {
                id: true,
                unidadOrigenID: true,
                factorConversion: true,
                precioVentaUnitario: true,
                UnidadMedida_ConversionUnidad_unidadOrigenIDToUnidadMedida: {
                  select: {
                    id: true,
                    nombre: true,
                    abreviatura: true,
                  }
                }
              }
            }
          }
        },
        DetalleCompra: {
          select: {
            Compra: {
              select: {
                numeroCompra: true,
                fechaRegistro: true,
                Proveedor: {
                  select: {
                    nombre: true,
                  }
                }
              }
            }
          }
        },
        // Calcular cantidad ya extraída
        StockVenta: {
          where: {
            estado: 1,
          },
          select: {
            cantidadUnidadesBase: true,
          }
        }
      },
      orderBy: {
        fechaRegistro: 'desc',
      }
    });

    

    // Transformar datos
    const stockDisponible = lotes.map(lote => {
      const cantidadExtraida = lote.StockVenta.reduce(
        (sum, stock) => sum + Number(stock.cantidadUnidadesBase), 
        0
      );
      const cantidadDisponible = Number(lote.cantidadInicialUnidadesBase) - cantidadExtraida;

      return {
        loteId: lote.id,
        numeroLote: lote.numeroLote,
        producto: {
          id: lote.Producto.id,
          nombre: lote.Producto.nombre,
          descripcion: lote.Producto.descripcion,
          unidadBase: {
            id: lote.Producto.UnidadMedida.id,
            nombre: lote.Producto.UnidadMedida.nombre,
            abreviatura: lote.Producto.UnidadMedida.abreviatura,
          }
        },
        compra: {
          numeroCompra: lote.DetalleCompra.Compra.numeroCompra,
          fecha: lote.DetalleCompra.Compra.fechaRegistro?.toISOString().split('T')[0],
          proveedor: lote.DetalleCompra.Compra.Proveedor.nombre,
        },
        fechaVencimiento: lote.fechaVencimiento?.toISOString().split('T')[0] || null,
        cantidadTotalUnidadesBase: Number(lote.cantidadInicialUnidadesBase),
        cantidadExtraidaUnidadesBase: cantidadExtraida,
        cantidadDisponibleUnidadesBase: cantidadDisponible,
        unidadesDisponibles: lote.Producto.ConversionUnidad.map(conv => ({
          conversionId: conv.id,
          unidadId: conv.unidadOrigenID,
          nombre: conv.UnidadMedida_ConversionUnidad_unidadOrigenIDToUnidadMedida.nombre,
          abreviatura: conv.UnidadMedida_ConversionUnidad_unidadOrigenIDToUnidadMedida.abreviatura,
          factor: Number(conv.factorConversion),
          precioVenta: Number(conv.precioVentaUnitario || 0),
          cantidadMaxima: Math.floor(cantidadDisponible / Number(conv.factorConversion)),
        }))
      };
    }).filter(item => item.cantidadDisponibleUnidadesBase > 0);

    return {
      success: true,
      data: stockDisponible,
    };
  } catch (error) {
    console.error('Error al obtener stock disponible:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// Interfaz para la extracción
interface ExtractStockItem {
  loteId: number;
  productoId: number;
  unidadMedidaId: number;
  cantidad: number;
  cantidadUnidadesBase: number;
  precioVenta: number;
  codigosBarras?: string[]; // Array de códigos de barras para cada unidad
}

interface ExtractStockRequest {
  items: ExtractStockItem[];
  usuarioId: number;
}

// Extraer stock para venta
export async function extractStockForSale(request: ExtractStockRequest) {
  try {
    // Validaciones
    if (!request.items || request.items.length === 0) {
      return {
        success: false,
        error: 'Debe incluir al menos un item para extraer',
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      const stocksCreados = [];
      const movimientosCreados = [];
      const codigosCreados = [];

      for (const item of request.items) {
        // Verificar que hay stock disponible en el lote
        const lote = await tx.lote.findUnique({
          where: { id: item.loteId },
          include: {
            StockVenta: {
              where: { estado: 1 },
              select: { cantidadUnidadesBase: true }
            }
          }
        });

        if (!lote) {
          throw new Error(`Lote ${item.loteId} no encontrado`);
        }

        const cantidadExtraida = lote.StockVenta.reduce(
          (sum, stock) => sum + Number(stock.cantidadUnidadesBase), 
          0
        );
        const disponible = Number(lote.cantidadInicialUnidadesBase) - cantidadExtraida;

        if (disponible < item.cantidadUnidadesBase) {
          throw new Error(
            `Stock insuficiente en lote ${lote.numeroLote}. ` +
            `Disponible: ${disponible}, Solicitado: ${item.cantidadUnidadesBase}`
          );
        }

        // 1. CREAR STOCK DE VENTA
        const stockVenta = await tx.stockVenta.create({
          data: {
            productoID: item.productoId,
            loteID: item.loteId,
            unidadMedidaID: item.unidadMedidaId,
            cantidadDisponible: item.cantidad,
            cantidadUnidadesBase: item.cantidadUnidadesBase,
            precioVenta: item.precioVenta,
            fechaVencimiento: lote.fechaVencimiento,
            estado: 1,
            fechaRegistro: getBoliviaTime(),
            usuarioRegistro: request.usuarioId,
          }
        });
        stocksCreados.push(stockVenta.id);

        // 2. REGISTRAR MOVIMIENTO DE SALIDA (tipo 2)
        const movimiento = await tx.movimientoAlmacen.create({
          data: {
            tipoMovimiento: 2, // 2 = SALIDA
            productoID: item.productoId,
            loteID: item.loteId,
            unidadMedidaID: item.unidadMedidaId,
            cantidad: item.cantidad,
            cantidadUnidadesBase: item.cantidadUnidadesBase,
            observaciones: `Salida para venta - Stock ID: ${stockVenta.id}`,
            fechaRegistro: getBoliviaTime(),
            usuarioIdRegistro: request.usuarioId,
          }
        });
        movimientosCreados.push(movimiento.id);

        // 3. REGISTRAR CÓDIGOS DE BARRAS (si existen)
        if (item.codigosBarras && item.codigosBarras.length > 0) {
          for (const codigo of item.codigosBarras) {
            if (codigo.trim()) {
              // Verificar que el código no exista
              const codigoExistente = await tx.codigoBarrasItem.findUnique({
                where: { codigoBarras: codigo.trim() }
              });

              if (codigoExistente) {
                throw new Error(`El código de barras ${codigo} ya existe`);
              }

              const codigoBarras = await tx.codigoBarrasItem.create({
                data: {
                  stockVentaID: stockVenta.id,
                  codigoBarras: codigo.trim(),
                  estado: 1,
                  fechaRegistro: getBoliviaTime(),
                  usuarioRegistro: request.usuarioId,
                }
              });
              codigosCreados.push(codigoBarras.id);
            }
          }
        }
      }

      return {
        stocksCreados: stocksCreados.length,
        movimientosCreados: movimientosCreados.length,
        codigosCreados: codigosCreados.length,
        stockIds: stocksCreados,
      };
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error al extraer stock:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al extraer stock',
    };
  }
}

// Obtener stock de venta disponible (ya extraído)
export async function getAvailableSalesStock() {
  try {
    const stockVenta = await prisma.stockVenta.findMany({
      where: {
        estado: 1,
        cantidadDisponible: {
          gt: 0
        }
      },
      select: {
        id: true,
        cantidadDisponible: true,
        cantidadUnidadesBase: true,
        precioVenta: true,
        fechaVencimiento: true,
        fechaRegistro: true,
        Producto: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
          }
        },
        UnidadMedida: {
          select: {
            id: true,
            nombre: true,
            abreviatura: true,
          }
        },
        Lote: {
          select: {
            id: true,
            numeroLote: true,
          }
        },
        CodigoBarrasItem: {
          where: {
            estado: 1,
          },
          select: {
            id: true,
            codigoBarras: true,
          }
        }
      },
      orderBy: {
        fechaRegistro: 'desc',
      }
    });

    const stockTransformado = stockVenta.map(stock => ({
      id: stock.id,
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
      cantidadUnidadesBase: Number(stock.cantidadUnidadesBase),
      precioVenta: Number(stock.precioVenta),
      fechaVencimiento: stock.fechaVencimiento?.toISOString().split('T')[0] || null,
      fechaRegistro: stock.fechaRegistro?.toISOString().split('T')[0] || null,
      codigosBarras: stock.CodigoBarrasItem.map(cb => ({
        id: cb.id,
        codigo: cb.codigoBarras,
      }))
    }));

    return {
      success: true,
      data: stockTransformado,
    };
  } catch (error) {
    console.error('Error al obtener stock de venta:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}