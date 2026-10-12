"use server";
import { prisma } from "@/src/lib/prisma";

export type MovementType = "entrada" | "traslado" | "salida";

export type InventoryMovement = {
  id: string;
  tipo: MovementType;
  fecha: string;
  producto: string;
  categoria: string | null;
  cantidad: number;
  unidad: string;
  lote: string | null;
  /** Número de compra o de venta según el tipo */
  referencia: string | null;
  /** Proveedor (entrada) o cliente (salida) */
  contraparte: string | null;
  codigoBarras: string | null;
};

const LIMITE = 2000;

/**
 * Historial unificado de inventario:
 *  - entrada:  compra que ingresó al almacén (MovimientoAlmacen tipo 1)
 *  - traslado: producto que pasó del almacén al estante (MovimientoAlmacen tipo 2)
 *  - salida:   producto vendido (DetalleVenta)
 */
export async function getInventoryMovements() {
  try {
    const [movimientos, ventas] = await Promise.all([
      prisma.movimientoAlmacen.findMany({
        where: { tipoMovimiento: { in: [1, 2] } },
        select: {
          id: true,
          tipoMovimiento: true,
          cantidad: true,
          referenciaID: true,
          tipoReferencia: true,
          fechaRegistro: true,
          Producto: { select: { nombre: true, Categoria: { select: { nombre: true } } } },
          UnidadMedida: { select: { abreviatura: true, nombre: true } },
          Lote: { select: { numeroLote: true } },
        },
        orderBy: { fechaRegistro: "desc" },
        take: LIMITE,
      }),
      prisma.detalleVenta.findMany({
        where: { Venta: { estado: 1 } },
        select: {
          id: true,
          cantidadVendida: true,
          CodigoBarrasItem: { select: { codigoBarras: true } },
          StockVenta: {
            select: {
              Producto: { select: { nombre: true, Categoria: { select: { nombre: true } } } },
              UnidadMedida: { select: { abreviatura: true, nombre: true } },
              Lote: { select: { numeroLote: true } },
            },
          },
          Venta: {
            select: {
              numeroVenta: true,
              fechaVenta: true,
              Cliente: { select: { nombre: true } },
            },
          },
        },
        orderBy: { id: "desc" },
        take: LIMITE,
      }),
    ]);

    // Compras referenciadas por los ingresos, para mostrar su número y proveedor
    const compraIds = Array.from(
      new Set(
        movimientos
          .filter((m) => m.tipoMovimiento === 1 && m.tipoReferencia === 1 && m.referenciaID)
          .map((m) => m.referenciaID as number),
      ),
    );
    const compras = compraIds.length
      ? await prisma.compra.findMany({
          where: { id: { in: compraIds } },
          select: { id: true, numeroCompra: true, Proveedor: { select: { nombre: true } } },
        })
      : [];
    const compraMap = new Map(compras.map((c) => [c.id, c]));

    const data: InventoryMovement[] = [];

    for (const m of movimientos) {
      if (!m.fechaRegistro) continue;
      const compra = m.referenciaID ? compraMap.get(m.referenciaID) : undefined;

      data.push({
        id: `mov-${m.id}`,
        tipo: m.tipoMovimiento === 1 ? "entrada" : "traslado",
        fecha: m.fechaRegistro.toISOString(),
        producto: m.Producto.nombre,
        categoria: m.Producto.Categoria.nombre,
        cantidad: Number(m.cantidad),
        unidad: m.UnidadMedida.abreviatura || m.UnidadMedida.nombre,
        lote: m.Lote?.numeroLote ?? null,
        referencia: m.tipoMovimiento === 1 ? (compra?.numeroCompra ?? null) : null,
        contraparte: m.tipoMovimiento === 1 ? (compra?.Proveedor.nombre ?? null) : null,
        codigoBarras: null,
      });
    }

    for (const v of ventas) {
      if (!v.Venta.fechaVenta) continue;

      data.push({
        id: `venta-${v.id}`,
        tipo: "salida",
        fecha: v.Venta.fechaVenta.toISOString(),
        producto: v.StockVenta.Producto.nombre,
        categoria: v.StockVenta.Producto.Categoria.nombre,
        cantidad: Number(v.cantidadVendida),
        unidad: v.StockVenta.UnidadMedida.abreviatura || v.StockVenta.UnidadMedida.nombre,
        lote: v.StockVenta.Lote?.numeroLote ?? null,
        referencia: v.Venta.numeroVenta,
        contraparte: v.Venta.Cliente.nombre,
        codigoBarras: v.CodigoBarrasItem?.codigoBarras ?? null,
      });
    }

    data.sort((a, b) => b.fecha.localeCompare(a.fecha));

    return { success: true as const, data };
  } catch (error) {
    console.error("Error al obtener movimientos de inventario:", error);

    return {
      success: false as const,
      data: [] as InventoryMovement[],
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
