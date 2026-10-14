"use server";
import { ANULACION_VENTA, ESTADO_ACTIVO, ESTADO_ANULADO, MOV_INGRESO_ANULADO } from "@/src/lib/anulaciones";
import { cargarAnulaciones } from "@/src/lib/anulaciones-datos";
import { prisma } from "@/src/lib/prisma";

export type MovementType = "entrada" | "traslado" | "salida" | "ajuste";

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
  /** Quién lo hizo: quien validó la recepción, sacó al estante, vendió o ajustó */
  usuario: string | null;
  /** Vencimiento del lote (ISO), si tiene */
  vence: string | null;
  /** Nombre completo de la unidad (la abreviatura va en `unidad`) */
  unidadNombre: string;
  /** Observación del movimiento (ajustes y traslados) */
  detalle: string | null;
  /** true si es el ingreso de una compra anulada o una venta anulada (queda en el historial, tachado, pero ya no suma) */
  anulado?: boolean;
  /** Quién, cuándo y por qué se anuló la venta de esta salida */
  anulacion?: { usuario: string; motivo: string; fecha: string } | null;
  /** Solo en los ajustes de inventario */
  ajuste?: { ubicacion: "almacen" | "estante"; motivo: string; comentario: string; usuario: string };
};

const LIMITE = 2000;

/**
 * Historial unificado de inventario:
 *  - entrada:  compra que ingresó al almacén (MovimientoAlmacen tipo 1)
 *  - traslado: producto que pasó del almacén al estante (MovimientoAlmacen tipo 2)
 *  - salida:   producto vendido (DetalleVenta)
 *  - ajuste:   corrección de stock en el almacén (tipo 3) o en el estante (tipo 4), con motivo y usuario
 */
export async function getInventoryMovements() {
  try {
    const [movimientos, ventas] = await Promise.all([
      prisma.movimientoAlmacen.findMany({
        where: { tipoMovimiento: { in: [1, 2, 3, 4, MOV_INGRESO_ANULADO] } },
        select: {
          id: true,
          tipoMovimiento: true,
          cantidad: true,
          referenciaID: true,
          tipoReferencia: true,
          fechaRegistro: true,
          observaciones: true,
          usuarioIdRegistro: true,
          Producto: { select: { nombre: true, Categoria: { select: { nombre: true } } } },
          UnidadMedida: { select: { abreviatura: true, nombre: true } },
          Lote: { select: { numeroLote: true, fechaVencimiento: true } },
        },
        orderBy: { fechaRegistro: "desc" },
        take: LIMITE,
      }),
      prisma.detalleVenta.findMany({
        // Las ventas anuladas también se listan (tachadas): el producto volvió al estante y debe quedar rastro de eso
        where: { Venta: { estado: { in: [ESTADO_ACTIVO, ESTADO_ANULADO] } } },
        select: {
          id: true,
          cantidadVendida: true,
          CodigoBarrasItem: { select: { codigoBarras: true } },
          StockVenta: {
            select: {
              Producto: { select: { nombre: true, Categoria: { select: { nombre: true } } } },
              UnidadMedida: { select: { abreviatura: true, nombre: true } },
              Lote: { select: { numeroLote: true, fechaVencimiento: true } },
            },
          },
          Venta: {
            select: {
              id: true,
              estado: true,
              numeroVenta: true,
              fechaVenta: true,
              usuarioRegistro: true,
              Cliente: { select: { nombre: true } },
            },
          },
        },
        orderBy: { id: "desc" },
        take: LIMITE,
      }),
    ]);

    const anulacionesVenta = await cargarAnulaciones(ANULACION_VENTA, Array.from(new Set(ventas.filter((v) => v.Venta.estado === ESTADO_ANULADO).map((v) => v.Venta.id))));

    // Compras referenciadas por los ingresos, para mostrar su número y proveedor
    const compraIds = Array.from(
      new Set(
        movimientos
          .filter((m) => (m.tipoMovimiento === 1 || m.tipoMovimiento === MOV_INGRESO_ANULADO) && m.tipoReferencia === 1 && m.referenciaID)
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

    // Quién hizo cada movimiento (recepción, traslado, ajuste o venta)
    const usuarioIds = Array.from(
      new Set([...movimientos.map((m) => m.usuarioIdRegistro), ...ventas.map((v) => v.Venta.usuarioRegistro)]),
    );
    const personas = usuarioIds.length
      ? await prisma.persona.findMany({ where: { id: { in: usuarioIds } }, select: { id: true, primerNombre: true, apellidoPaterno: true } })
      : [];
    const nombres = new Map(personas.map((p) => [p.id, `${p.primerNombre} ${p.apellidoPaterno}`]));

    const data: InventoryMovement[] = [];

    for (const m of movimientos) {
      if (!m.fechaRegistro) continue;
      const compra = m.referenciaID ? compraMap.get(m.referenciaID) : undefined;

      if (m.tipoMovimiento === 3 || m.tipoMovimiento === 4) {
        const [motivo, ...resto] = (m.observaciones ?? "").split(" · ");

        data.push({
          id: `mov-${m.id}`,
          tipo: "ajuste",
          fecha: m.fechaRegistro.toISOString(),
          producto: m.Producto.nombre,
          categoria: m.Producto.Categoria.nombre,
          cantidad: Number(m.cantidad),
          unidad: m.UnidadMedida.abreviatura || m.UnidadMedida.nombre,
          lote: m.Lote?.numeroLote ?? null,
          referencia: null,
          contraparte: null,
          codigoBarras: null,
          usuario: nombres.get(m.usuarioIdRegistro) ?? null,
          vence: m.Lote?.fechaVencimiento ? m.Lote.fechaVencimiento.toISOString() : null,
          unidadNombre: m.UnidadMedida.nombre,
          detalle: m.observaciones ?? null,
          ajuste: {
            ubicacion: m.tipoMovimiento === 3 ? "almacen" : "estante",
            motivo: motivo || "Ajuste",
            comentario: resto.join(" · "),
            usuario: nombres.get(m.usuarioIdRegistro) ?? `Usuario ${m.usuarioIdRegistro}`,
          },
        });
        continue;
      }

      const esEntrada = m.tipoMovimiento === 1 || m.tipoMovimiento === MOV_INGRESO_ANULADO;

      data.push({
        id: `mov-${m.id}`,
        anulado: m.tipoMovimiento === MOV_INGRESO_ANULADO,
        tipo: esEntrada ? "entrada" : "traslado",
        fecha: m.fechaRegistro.toISOString(),
        producto: m.Producto.nombre,
        categoria: m.Producto.Categoria.nombre,
        cantidad: Number(m.cantidad),
        unidad: m.UnidadMedida.abreviatura || m.UnidadMedida.nombre,
        lote: m.Lote?.numeroLote ?? null,
        referencia: esEntrada ? (compra?.numeroCompra ?? null) : null,
        contraparte: esEntrada ? (compra?.Proveedor.nombre ?? null) : null,
        codigoBarras: null,
        usuario: nombres.get(m.usuarioIdRegistro) ?? null,
        vence: m.Lote?.fechaVencimiento ? m.Lote.fechaVencimiento.toISOString() : null,
        unidadNombre: m.UnidadMedida.nombre,
        detalle: m.observaciones ?? null,
      });
    }

    for (const v of ventas) {
      if (!v.Venta.fechaVenta) continue;

      data.push({
        id: `venta-${v.id}`,
        tipo: "salida",
        anulado: v.Venta.estado === ESTADO_ANULADO,
        anulacion: v.Venta.estado === ESTADO_ANULADO ? (anulacionesVenta.get(v.Venta.id) ?? null) : undefined,
        fecha: v.Venta.fechaVenta.toISOString(),
        producto: v.StockVenta.Producto.nombre,
        categoria: v.StockVenta.Producto.Categoria.nombre,
        cantidad: Number(v.cantidadVendida),
        unidad: v.StockVenta.UnidadMedida.abreviatura || v.StockVenta.UnidadMedida.nombre,
        lote: v.StockVenta.Lote?.numeroLote ?? null,
        referencia: v.Venta.numeroVenta,
        contraparte: v.Venta.Cliente.nombre,
        codigoBarras: v.CodigoBarrasItem?.codigoBarras ?? null,
        usuario: nombres.get(v.Venta.usuarioRegistro) ?? null,
        vence: v.StockVenta.Lote?.fechaVencimiento ? v.StockVenta.Lote.fechaVencimiento.toISOString() : null,
        unidadNombre: v.StockVenta.UnidadMedida.nombre,
        detalle: null,
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
