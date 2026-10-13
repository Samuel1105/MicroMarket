"use server";
import { MOTIVOS_ANULACION_VENTA, ANULACION_VENTA, ESTADO_ACTIVO, ESTADO_ANULADO, puedeAnularVenta } from "@/src/lib/anulaciones";
import { avisarCambio, cerrarAvisosResueltos } from "@/src/lib/notifications";
import { prisma } from "@/src/lib/prisma";
import { getBoliviaTime, hoyBolivia } from "@/src/utils/date";

/**
 * Anula una venta: el producto vuelve al estante, el código de barras vuelve a estar disponible y la venta
 * deja de contar en los reportes. Queda registrada (motivo, usuario, fecha) en la tabla Anulacion.
 *
 * Administrador: cualquier venta. Cajero: solo una venta suya y de hoy.
 */
export async function anularVenta(input: { ventaId: number; motivo: string; comentario: string; usuarioId: number }) {
  try {
    const persona = await prisma.persona.findFirst({ where: { id: input.usuarioId, estado: 1 }, select: { rol: true } });

    if (!persona) return { success: false as const, error: "Usuario no válido: vuelve a iniciar sesión." };
    if (!(MOTIVOS_ANULACION_VENTA as readonly string[]).includes(input.motivo)) {
      return { success: false as const, error: "Elige un motivo válido." };
    }

    const comentario = (input.comentario ?? "").trim();

    if (comentario.length < 3) return { success: false as const, error: "Escribe un comentario que explique la anulación." };
    if (comentario.length > 150) return { success: false as const, error: "El comentario es demasiado largo (máximo 150 caracteres)." };

    const productoIds = await prisma.$transaction(async (tx) => {
      const venta = await tx.venta.findUnique({
        where: { id: input.ventaId },
        select: {
          id: true,
          estado: true,
          fechaVenta: true,
          usuarioRegistro: true,
          DetalleVenta: { select: { stockVentaID: true, codigoBarrasItemID: true, cantidadVendida: true, cantidadUnidadesBase: true } },
        },
      });

      if (!venta) throw new Error("La venta no existe.");
      if (venta.estado !== ESTADO_ACTIVO) throw new Error("Esta venta ya está anulada.");

      const esDeHoy = !!venta.fechaVenta && venta.fechaVenta.toISOString().slice(0, 10) === hoyBolivia();

      if (!puedeAnularVenta(persona.rol, { esSuya: venta.usuarioRegistro === input.usuarioId, esDeHoy })) {
        throw new Error(
          persona.rol === 2
            ? "Un cajero solo puede anular una venta suya y de hoy. Pide al administrador que la anule."
            : "No tienes permiso para anular ventas.",
        );
      }

      const productos = new Set<number>();

      for (const d of venta.DetalleVenta) {
        // El producto vuelve al estante (y vuelve a estar disponible si se había agotado)
        const stock = await tx.stockVenta.update({
          where: { id: d.stockVentaID },
          data: {
            cantidadDisponible: { increment: d.cantidadVendida },
            cantidadUnidadesBase: { increment: d.cantidadUnidadesBase },
            estado: 1,
          },
          select: { productoID: true },
        });

        productos.add(stock.productoID);

        if (d.codigoBarrasItemID) {
          await tx.codigoBarrasItem.update({ where: { id: d.codigoBarrasItemID }, data: { estado: 1 } });
        }
      }

      await tx.venta.update({ where: { id: venta.id }, data: { estado: ESTADO_ANULADO } });
      await tx.anulacion.create({
        data: {
          tipo: ANULACION_VENTA,
          referenciaID: venta.id,
          motivo: `${input.motivo} · ${comentario}`,
          usuarioID: input.usuarioId,
          fecha: getBoliviaTime(),
        },
      });

      return Array.from(productos);
    });

    await cerrarAvisosResueltos(productoIds);
    avisarCambio();

    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "No se pudo anular la venta." };
  }
}
