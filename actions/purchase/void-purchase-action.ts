"use server";
import {
  ANULACION_COMPRA,
  ESTADO_ACTIVO,
  ESTADO_ANULADO,
  MOTIVOS_ANULACION_COMPRA,
  MOV_INGRESO_ANULADO,
  puedeAnularCompra,
} from "@/src/lib/anulaciones";
import { ESTADO_COMPRA_POR_RECIBIR } from "@/src/lib/compras";
import { avisarCambio, cerrarAvisosResueltos } from "@/src/lib/notifications";
import { prisma } from "@/src/lib/prisma";
import { MOV_AJUSTE_ALMACEN, MOV_AJUSTE_ESTANTE, MOV_INGRESO, MOV_SALIDA_ESTANTE } from "@/src/lib/stock-almacen";
import { getBoliviaTime } from "@/src/utils/date";

/**
 * Anula una compra: la compra y sus lotes pasan a estado anulado (dejan de contar en reportes y de estar en el
 * almacén) y el ingreso al almacén queda marcado como "ingreso anulado" en el historial.
 *
 * Solo Administrador y Compras. Solo si NO se sacó nada de sus lotes al estante ni se ajustaron.
 * Una compra "por recibir" (aún sin recepción) también se puede anular: se cancela el pedido.
 */
export async function anularCompra(input: { compraId: number; motivo: string; comentario: string; usuarioId: number }) {
  try {
    const persona = await prisma.persona.findFirst({ where: { id: input.usuarioId, estado: 1 }, select: { rol: true } });

    if (!persona || !puedeAnularCompra(persona.rol)) {
      return { success: false as const, error: "Solo el Administrador y Compras pueden anular una compra." };
    }
    if (!(MOTIVOS_ANULACION_COMPRA as readonly string[]).includes(input.motivo)) {
      return { success: false as const, error: "Elige un motivo válido." };
    }

    const comentario = (input.comentario ?? "").trim();

    if (comentario.length < 3) return { success: false as const, error: "Escribe un comentario que explique la anulación." };
    if (comentario.length > 150) return { success: false as const, error: "El comentario es demasiado largo (máximo 150 caracteres)." };

    const productoIds = await prisma.$transaction(async (tx) => {
      const compra = await tx.compra.findUnique({
        where: { id: input.compraId },
        select: {
          id: true,
          estado: true,
          DetalleCompra: {
            select: {
              id: true,
              productoID: true,
              Lote: {
                select: {
                  id: true,
                  numeroLote: true,
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
      });

      if (!compra) throw new Error("La compra no existe.");
      const porRecibir = compra.estado === ESTADO_COMPRA_POR_RECIBIR;

      if (compra.estado !== ESTADO_ACTIVO && !porRecibir) throw new Error("Esta compra ya está anulada.");

      const lotes = compra.DetalleCompra.flatMap((d) => d.Lote);
      const usado = lotes.find((l) => l.MovimientoAlmacen.length > 0);

      if (usado) {
        throw new Error(
          `No se puede anular: del lote ${usado.numeroLote} ya se sacó producto al estante o se ajustó su stock. ` +
            "Solo se pueden anular compras cuya mercadería sigue completa en el almacén.",
        );
      }

      await tx.compra.update({ where: { id: compra.id }, data: { estado: ESTADO_ANULADO } });
      await tx.detalleCompra.updateMany({ where: { compraID: compra.id }, data: { estado: ESTADO_ANULADO } });
      await tx.lote.updateMany({ where: { id: { in: lotes.map((l) => l.id) } }, data: { estado: ESTADO_ANULADO } });
      // El ingreso queda en el historial, pero ya no cuenta como entrada
      if (!porRecibir) {
        await tx.movimientoAlmacen.updateMany({
          where: { tipoMovimiento: MOV_INGRESO, tipoReferencia: 1, referenciaID: compra.id },
          data: { tipoMovimiento: MOV_INGRESO_ANULADO },
        });
      }
      await tx.anulacion.create({
        data: {
          tipo: ANULACION_COMPRA,
          referenciaID: compra.id,
          motivo: `${input.motivo} · ${comentario}`,
          usuarioID: input.usuarioId,
          fecha: getBoliviaTime(),
        },
      });

      return Array.from(new Set(compra.DetalleCompra.map((d) => d.productoID)));
    });

    await cerrarAvisosResueltos(productoIds);
    avisarCambio();

    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "No se pudo anular la compra." };
  }
}
