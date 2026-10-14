"use server";
import { prisma } from "@/src/lib/prisma";
import { cerrarAvisosResueltos } from "@/src/lib/notifications";
import { getBoliviaTime } from "@/src/utils/date";
import { carnetValido, MENSAJE_CARNET, normalizarCarnet } from "@/src/lib/carnet";
import { MAX_DESCUENTO_SIN_ADMIN, puedeCambiarPrecio } from "@/src/lib/sales-rules";

/** Fecha de hoy (Bolivia) como YYYY-MM-DD */
function hoyBolivia() {
  return getBoliviaTime().toISOString().slice(0, 10);
}

function estaVencido(fecha: Date | null | undefined) {
  return !!fecha && fecha.toISOString().slice(0, 10) < hoyBolivia();
}

// ========== BÚSQUEDA DE CLIENTES ==========
export async function searchClientByCarnet(carnetEscrito: string) {
  try {
    const carnet = normalizarCarnet(carnetEscrito);

    if (carnet !== "0" && !carnetValido(carnet)) {
      return { success: false, data: null, exists: false, error: MENSAJE_CARNET };
    }

    // Se busca el carnet exacto o con complemento (quien escribe "6234517" encuentra a "6234517 CB")
    const cliente = await prisma.cliente.findFirst({
      where: {
        estado: 1,
        OR: [{ carnet }, { carnet: { startsWith: `${carnet} ` } }, { carnet: { startsWith: `${carnet}-` } }],
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

// ========== CLIENTE GENERAL (venta rápida sin datos) ==========
/** Carnet reservado para las ventas a clientes que no quieren registrarse */
const CARNET_CLIENTE_GENERAL = "0";

export async function getGeneralClient(usuarioIdRegistro: number) {
  try {
    let cliente = await prisma.cliente.findFirst({
      where: { carnet: CARNET_CLIENTE_GENERAL },
      select: { id: true, carnet: true, nombre: true, correo: true },
    });

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          carnet: CARNET_CLIENTE_GENERAL,
          nombre: "Cliente general",
          correo: "",
          estado: 1,
          fechaRegistro: getBoliviaTime(),
          usuarioIdRegistro,
        },
        select: { id: true, carnet: true, nombre: true, correo: true },
      });
    }

    return { success: true, data: cliente };
  } catch (error) {
    console.error("Error al obtener el cliente general:", error);

    return { success: false, data: null, error: error instanceof Error ? error.message : "Error desconocido" };
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
    const carnet = normalizarCarnet(data.carnet);

    if (!carnetValido(carnet)) {
      return { success: false, error: MENSAJE_CARNET };
    }

    // Verificar si ya existe
    const existente = await prisma.cliente.findFirst({
      where: { carnet },
    });

    if (existente) {
      return {
        success: false,
        error: 'Ya existe un cliente con este carnet',
      };
    }

    const cliente = await prisma.cliente.create({
      data: {
        carnet,
        nombre: data.nombre.trim(),
        correo: data.correo.trim().toLowerCase(),
        estado: 1,
        fechaRegistro: getBoliviaTime(),
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

    if (estaVencido(codigoBarras.StockVenta.fechaVencimiento)) {
      return {
        success: false,
        data: null,
        error: 'Producto vencido: no se puede vender',
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
        // Lo vencido no se ofrece para la venta
        OR: [
          { fechaVencimiento: null },
          { fechaVencimiento: { gte: new Date(hoyBolivia() + 'T00:00:00.000Z') } },
        ],
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
            Categoria: {
              select: {
                nombre: true,
              },
            },
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
        categoria: stock.Producto.Categoria.nombre,
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
  metodoPago?: number; // siempre 1 = efectivo (el sistema solo cobra en efectivo)
  detalles: DetalleVentaItem[];
  usuarioId: number;
}

export async function processSale(request: ProcessSaleRequest) {
  try {
    // Validaciones
    if (request.clienteId == null || !(request.detalles?.length > 0)) {
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

    // Quién vende: el precio y el descuento se controlan según su rol (no se confía en la pantalla)
    const vendedor = await prisma.persona.findFirst({ where: { id: request.usuarioId, estado: 1 }, select: { rol: true } });

    if (!vendedor) {
      return { success: false, error: 'Usuario no válido: vuelve a iniciar sesión' };
    }

    // Los totales deben cuadrar con las líneas (evita totales manipulados)
    const sumaLineas = request.detalles.reduce((s, d) => s + d.total, 0);

    if (Math.abs(sumaLineas - request.total) > 0.05) {
      return { success: false, error: 'El total no coincide con el detalle de la venta. Revisa los productos e inténtalo de nuevo.' };
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
          fechaVenta: getBoliviaTime(),
          usuarioRegistro: request.usuarioId,
        },
      });

      // El número definitivo lo da el servidor con el id de la venta: así nunca se repite
      const numeroDefinitivo = `VENTA-${getBoliviaTime().toISOString().slice(0, 10).replace(/-/g, "")}-${String(venta.id).padStart(6, "0")}`;

      await tx.venta.update({ where: { id: venta.id }, data: { numeroVenta: numeroDefinitivo } });
      venta.numeroVenta = numeroDefinitivo;

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

        if (estaVencido(stockVenta.fechaVencimiento)) {
          throw new Error('Hay un producto vencido en la venta: retíralo del carrito');
        }

        if (!puedeCambiarPrecio(vendedor.rol)) {
          if (Math.abs(Number(stockVenta.precioVenta) - detalle.precioUnitario) > 0.005) {
            throw new Error('Solo el administrador puede cambiar el precio de venta.');
          }
          if ((detalle.descuento ?? 0) > detalle.subtotal * MAX_DESCUENTO_SIN_ADMIN + 0.01) {
            throw new Error(`El descuento máximo sin ser administrador es del ${MAX_DESCUENTO_SIN_ADMIN * 100}% por producto.`);
          }
        }

        if (Number(stockVenta.cantidadDisponible) < detalle.cantidadVendida) {
          throw new Error(
            `Stock insuficiente. Disponible: ${stockVenta.cantidadDisponible}, ` +
            `Solicitado: ${detalle.cantidadVendida}`
          );
        }

        // Unidades base que salen: cantidad vendida × factor de la unidad de este stock
        // (el stock guarda cuántas unidades base hay en cada unidad de venta)
        const disponibleActual = Number(stockVenta.cantidadDisponible);
        const factorUnidad = disponibleActual > 0 ? Number(stockVenta.cantidadUnidadesBase) / disponibleActual : 1;
        const unidadesBaseVendidas = detalle.cantidadVendida * factorUnidad;

        // 2.1 CREAR DETALLE DE VENTA
        await tx.detalleVenta.create({
          data: {
            ventaID: venta.id,
            stockVentaID: detalle.stockVentaId,
            codigoBarrasItemID: detalle.codigoBarrasId || null,
            cantidadVendida: detalle.cantidadVendida,
            cantidadUnidadesBase: unidadesBaseVendidas,
            precioUnitario: detalle.precioUnitario,
            subtotal: detalle.subtotal,
            descuento: detalle.descuento || 0,
            total: detalle.total,
          },
        });
        detallesCreados++;

        // 2.2 ACTUALIZAR STOCK
        const nuevaCantidad = Number(stockVenta.cantidadDisponible) - detalle.cantidadVendida;
        const nuevaCantidadBase = Number(stockVenta.cantidadUnidadesBase) - unidadesBaseVendidas;

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

    // Si esta venta hizo innecesario algún aviso pendiente, se cierra
    const vendidos = await prisma.stockVenta.findMany({
      where: { id: { in: request.detalles.map((d) => d.stockVentaId) } },
      select: { productoID: true },
    });

    await cerrarAvisosResueltos(vendidos.map((v) => v.productoID));

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

