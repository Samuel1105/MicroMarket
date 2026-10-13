"use server";
import { ESTADO_COMPRA_POR_RECIBIR, ESTADO_COMPRA_RECIBIDA, puedeValidarRecepcion } from "@/src/lib/compras";
import { avisarCambio, cerrarAvisosResueltos } from "@/src/lib/notifications";
import { prisma } from "@/src/lib/prisma";
import { MOV_INGRESO } from "@/src/lib/stock-almacen";
import { getBoliviaTime, hoyBolivia } from "@/src/utils/date";

const redondear = (n: number) => Math.round(n * 100) / 100;
const num = (n: unknown) => Number(n ?? 0);

export type LineaRecepcion = {
  detalleId: number;
  producto: string;
  unidad: string;
  /** Lo que se pidió, en la unidad de compra */
  cantidadPedida: number;
  precioUnitario: number;
  numeroLote: string;
  fechaVencimiento: string | null; // YYYY-MM-DD
};

export type CompraPorRecibir = {
  id: number;
  numeroCompra: string;
  fecha: string; // YYYY-MM-DD
  proveedor: string;
  total: number;
  lineas: LineaRecepcion[];
};

/** Compras confirmadas que todavía no se recibieron en el almacén */
export async function getComprasPorRecibir(): Promise<{ success: boolean; data: CompraPorRecibir[]; error?: string }> {
  try {
    const compras = await prisma.compra.findMany({
      where: { estado: ESTADO_COMPRA_POR_RECIBIR },
      orderBy: { fechaRegistro: "asc" },
      select: {
        id: true,
        numeroCompra: true,
        fechaRegistro: true,
        total: true,
        Proveedor: { select: { nombre: true } },
        DetalleCompra: {
          where: { estado: 1 },
          select: {
            id: true,
            cantidadComprada: true,
            precioUnitario: true,
            Producto: { select: { nombre: true } },
            UnidadMedida: { select: { nombre: true, abreviatura: true } },
            Lote: { select: { numeroLote: true, fechaVencimiento: true } },
          },
        },
      },
    });

    return {
      success: true,
      data: compras.map((c) => ({
        id: c.id,
        numeroCompra: c.numeroCompra || `Compra ${c.id}`,
        fecha: c.fechaRegistro?.toISOString().slice(0, 10) ?? "",
        proveedor: c.Proveedor.nombre,
        total: num(c.total),
        lineas: c.DetalleCompra.map((d) => ({
          detalleId: d.id,
          producto: d.Producto.nombre,
          unidad: d.UnidadMedida.abreviatura || d.UnidadMedida.nombre,
          cantidadPedida: num(d.cantidadComprada),
          precioUnitario: num(d.precioUnitario),
          numeroLote: d.Lote[0]?.numeroLote ?? "",
          fechaVencimiento: d.Lote[0]?.fechaVencimiento?.toISOString().slice(0, 10) ?? null,
        })),
      })),
    };
  } catch (error) {
    console.error("Error al listar compras por recibir:", error);

    return { success: false, data: [], error: "No se pudieron cargar las compras por recibir" };
  }
}

/** Cuántas compras esperan recepción (para el Dashboard) */
export async function contarComprasPorRecibir(): Promise<number> {
  try {
    return await prisma.compra.count({ where: { estado: ESTADO_COMPRA_POR_RECIBIR } });
  } catch {
    return 0;
  }
}

export type RecepcionRequest = {
  compraId: number;
  /** Lo que realmente llegó, por línea (en la unidad de compra; 0 = no llegó) */
  lineas: Array<{ detalleId: number; cantidadRecibida: number; numeroLote: string; fechaVencimiento: string | null }>;
  usuarioId: number;
};

/**
 * Valida la recepción: el Gestor de Almacén verifica lo que llegó contra lo pedido (nunca más de lo pedido),
 * completa lote y vencimiento, y el sistema crea el lote y registra el ingreso al almacén (movimiento tipo 1).
 * Si llegó menos de lo pedido, la compra se ajusta a lo recibido y la diferencia queda anotada en el movimiento.
 */
export async function validarRecepcion(req: RecepcionRequest) {
  try {
    const persona = await prisma.persona.findFirst({ where: { id: req.usuarioId, estado: 1 }, select: { rol: true } });

    if (!persona || !puedeValidarRecepcion(persona.rol)) {
      return { success: false as const, error: "Solo el Gestor de Almacén y el Administrador pueden validar la recepción." };
    }
    if (!Array.isArray(req.lineas) || req.lineas.length === 0) {
      return { success: false as const, error: "No hay líneas para recibir." };
    }

    const hoy = hoyBolivia();

    const resultado = await prisma.$transaction(async (tx) => {
      const compra = await tx.compra.findUnique({
        where: { id: req.compraId },
        select: {
          id: true,
          estado: true,
          numeroCompra: true,
          DetalleCompra: {
            where: { estado: 1 },
            select: {
              id: true,
              productoID: true,
              unidadMedidaID: true,
              cantidadComprada: true,
              precioUnitario: true,
              descuento: true,
              Lote: { select: { id: true, cantidadInicialUnidadesBase: true } },
            },
          },
        },
      });

      if (!compra) throw new Error("La compra no existe.");
      if (compra.estado !== ESTADO_COMPRA_POR_RECIBIR) throw new Error("Esta compra ya no está por recibir (ya se recibió o se anuló).");

      const porDetalle = new Map(req.lineas.map((l) => [l.detalleId, l]));

      if (compra.DetalleCompra.some((d) => !porDetalle.has(d.id))) {
        throw new Error("Falta indicar la cantidad recibida de algún producto.");
      }

      let recibidas = 0;
      let diferencias = 0;
      let subtotalCompra = 0;
      let descuentoCompra = 0;
      const productos = new Set<number>();

      for (const d of compra.DetalleCompra) {
        const l = porDetalle.get(d.id)!;
        const pedida = num(d.cantidadComprada);
        const recibida = redondear(Number(l.cantidadRecibida));
        const lote = d.Lote[0];

        if (!lote) throw new Error("Una línea de la compra no tiene lote asociado.");
        if (!Number.isFinite(recibida) || recibida < 0) throw new Error("La cantidad recibida debe ser 0 o mayor.");
        if (recibida > pedida + 0.0001) {
          throw new Error(`No se puede recibir más de lo pedido (pediste ${pedida}). Si llegó más, registra otra compra.`);
        }

        if (recibida <= 0) {
          // No llegó: la línea se cierra sin ingreso
          await tx.detalleCompra.update({ where: { id: d.id }, data: { estado: 2 } });
          await tx.lote.update({ where: { id: lote.id }, data: { estado: 2 } });
          diferencias += 1;
          continue;
        }

        const numeroLote = (l.numeroLote ?? "").trim();

        if (!numeroLote) throw new Error("Escribe el número de lote de cada producto recibido.");
        if (l.fechaVencimiento && l.fechaVencimiento < hoy) {
          throw new Error("No se puede recibir mercadería ya vencida: pon cantidad 0 en esa línea y anota el rechazo.");
        }

        // Unidades base por cada unidad de compra (la conversión se calculó al confirmar la compra)
        const factor = pedida > 0 ? num(lote.cantidadInicialUnidadesBase) / pedida : 1;
        const base = redondear(recibida * factor);
        const proporcion = pedida > 0 ? recibida / pedida : 1;
        const subtotal = redondear(recibida * num(d.precioUnitario));
        const descuento = redondear(num(d.descuento) * proporcion);

        await tx.detalleCompra.update({
          where: { id: d.id },
          data: { cantidadComprada: recibida, subtotal, descuento, total: Math.max(redondear(subtotal - descuento), 0) },
        });
        await tx.lote.update({
          where: { id: lote.id },
          data: {
            estado: 1,
            numeroLote,
            fechaVencimiento: l.fechaVencimiento ? new Date(`${l.fechaVencimiento}T00:00:00.000Z`) : null,
            cantidadInicialUnidadesBase: base,
            fechaRegistro: getBoliviaTime(),
            usuarioIdRegistro: req.usuarioId,
          },
        });

        const nota = recibida < pedida - 0.0001 ? ` · Recibido ${recibida} de ${pedida} pedidos` : "";

        await tx.movimientoAlmacen.create({
          data: {
            tipoMovimiento: MOV_INGRESO,
            productoID: d.productoID,
            loteID: lote.id,
            unidadMedidaID: d.unidadMedidaID,
            cantidad: recibida,
            cantidadUnidadesBase: base,
            referenciaID: compra.id,
            tipoReferencia: 1,
            observaciones: `Ingreso por compra ${compra.numeroCompra ?? compra.id}${nota}`.slice(0, 200),
            fechaRegistro: getBoliviaTime(),
            usuarioIdRegistro: req.usuarioId,
          },
        });

        if (recibida < pedida - 0.0001) diferencias += 1;
        recibidas += 1;
        subtotalCompra += subtotal;
        descuentoCompra += descuento;
        productos.add(d.productoID);
      }

      if (recibidas === 0) {
        throw new Error("No recibiste nada: si la compra no llegó, anúlala desde el historial de compras.");
      }

      await tx.compra.update({
        where: { id: compra.id },
        data: {
          estado: ESTADO_COMPRA_RECIBIDA,
          subtotal: redondear(subtotalCompra),
          descuento: redondear(descuentoCompra),
          total: Math.max(redondear(subtotalCompra - descuentoCompra), 0),
        },
      });

      return { productos: Array.from(productos), lineasRecibidas: recibidas, conDiferencia: diferencias, numeroCompra: compra.numeroCompra };
    });

    // Ya hay stock: se cierran los avisos de "comprar" que ya no hacen falta
    await cerrarAvisosResueltos(resultado.productos);
    avisarCambio();

    return { success: true as const, data: { numeroCompra: resultado.numeroCompra, lineasRecibidas: resultado.lineasRecibidas, conDiferencia: resultado.conDiferencia } };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "No se pudo validar la recepción." };
  }
}
