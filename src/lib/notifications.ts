import { EventEmitter } from "events";

import { prisma } from "@/src/lib/prisma";
import { getBoliviaTime } from "@/src/utils/date";

/**
 * Notificaciones internas entre roles. Son TAREAS:
 *  - las envía a mano el cajero o el administrador ("saquen más al estante", "compren este producto");
 *  - se cierran solas cuando la tarea se hace (se extrae producto, se compra) o se descartan a mano.
 *
 * Este archivo no es un "use server": son funciones internas del servidor. Un fallo aquí nunca debe
 * romper la venta, la extracción o la compra que las llama.
 */

export const ROL_ADMIN = 1;
export const ROL_CAJERO = 2;
export const ROL_ALMACEN = 3;
export const ROL_COMPRAS = 5;

export type TipoNotificacion = "estante_vacio" | "comprar";

export const ESTADO_PENDIENTE = 0;
export const ESTADO_RESUELTA = 1;
export const ESTADO_DESCARTADA = 2;

const CONFIG: Record<TipoNotificacion, { rol: number; enlace: string }> = {
  estante_vacio: { rol: ROL_ALMACEN, enlace: "/Dashboard/Purchase/Stock" },
  comprar: { rol: ROL_COMPRAS, enlace: "/Dashboard/Purchase/New" },
};

/**
 * Bus en memoria: cuando algo cambia, las conexiones SSE abiertas se enteran al instante.
 * Vive en globalThis para que lo compartan las acciones del servidor y la ruta del stream.
 */
const g = globalThis as unknown as { __notifBus?: EventEmitter };

export const notifBus: EventEmitter = g.__notifBus ?? (g.__notifBus = new EventEmitter().setMaxListeners(0));

export function avisarCambio() {
  notifBus.emit("cambio");
}

function num(n: unknown) {
  return Number(n ?? 0);
}

/** Cuánto hay de un producto en el estante y en el almacén (sin contar lo vencido) */
export async function stockDeProducto(productoID: number) {
  const hoy = getBoliviaTime().toISOString().slice(0, 10);
  const inicioHoy = new Date(`${hoy}T00:00:00.000Z`);

  const [producto, estantes, lotes] = await Promise.all([
    prisma.producto.findUnique({
      where: { id: productoID },
      select: { nombre: true, stockMinimo: true, estado: true, UnidadMedida: { select: { abreviatura: true, nombre: true } } },
    }),
    prisma.stockVenta.findMany({
      where: {
        productoID,
        estado: 1,
        cantidadDisponible: { gt: 0 },
        OR: [{ fechaVencimiento: null }, { fechaVencimiento: { gte: inicioHoy } }],
      },
      select: { cantidadUnidadesBase: true },
    }),
    prisma.lote.findMany({
      where: { productoID, estado: 1, OR: [{ fechaVencimiento: null }, { fechaVencimiento: { gte: inicioHoy } }] },
      select: {
        cantidadInicialUnidadesBase: true,
        MovimientoAlmacen: { where: { tipoMovimiento: 2 }, select: { cantidadUnidadesBase: true } },
      },
    }),
  ]);

  if (!producto || producto.estado !== 1) return null;

  const estante = estantes.reduce((s, e) => s + num(e.cantidadUnidadesBase), 0);
  const almacen = lotes.reduce(
    (s, l) =>
      s + Math.max(num(l.cantidadInicialUnidadesBase) - l.MovimientoAlmacen.reduce((t, m) => t + num(m.cantidadUnidadesBase), 0), 0),
    0,
  );

  return {
    nombre: producto.nombre,
    unidad: producto.UnidadMedida.abreviatura || producto.UnidadMedida.nombre,
    minimo: num(producto.stockMinimo),
    estante,
    almacen,
    total: estante + almacen,
  };
}

/**
 * Crea un aviso enviado por una persona. Devuelve un mensaje claro si no corresponde
 * (por ejemplo, avisar "sacar al estante" cuando el almacén está vacío).
 */
export async function crearAviso(tipo: TipoNotificacion, productoID: number, usuarioId: number) {
  const s = await stockDeProducto(productoID);

  if (!s) return { success: false as const, error: "El producto no existe o está inactivo" };

  const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });

  if (tipo === "estante_vacio" && s.almacen <= 0.001) {
    return { success: false as const, error: "No hay más de este producto en el almacén: avisa a Compras para que lo compren." };
  }

  const yaHay = await prisma.notificacion.count({ where: { tipo, productoID, estado: ESTADO_PENDIENTE } });

  if (yaHay > 0) return { success: false as const, error: "Ya se envió este aviso y sigue pendiente." };

  const persona = await prisma.persona.findUnique({ where: { id: usuarioId }, select: { primerNombre: true, apellidoPaterno: true } });
  const quien = persona ? `${persona.primerNombre} ${persona.apellidoPaterno}` : "Un compañero";

  const titulo = tipo === "estante_vacio" ? `Sacar ${s.nombre} al estante` : `Comprar ${s.nombre}`;
  const mensaje =
    tipo === "estante_vacio"
      ? `${quien} avisa que en el estante quedan ${fmt(s.estante)} ${s.unidad} de ${s.nombre}. En el almacén hay ${fmt(s.almacen)} ${s.unidad}: pasa más al punto de venta.`
      : s.total <= 0.001
        ? `${quien} avisa que se agotó ${s.nombre}: no queda ni en el estante ni en el almacén. Haz una compra a tu proveedor.`
        : `${quien} avisa que solo quedan ${fmt(s.total)} ${s.unidad} de ${s.nombre} (mínimo ${fmt(s.minimo)}) y el almacén está vacío. Haz una compra a tu proveedor.`;

  await prisma.notificacion.create({
    data: {
      tipo,
      productoID,
      rolDestino: CONFIG[tipo].rol,
      titulo,
      mensaje,
      enlace: CONFIG[tipo].enlace,
      estado: ESTADO_PENDIENTE,
      fechaRegistro: getBoliviaTime(),
      usuarioIdRegistro: usuarioId,
    },
  });
  avisarCambio();

  return { success: true as const };
}

/**
 * Cierra los avisos de un producto cuando la tarea ya se cumplió:
 *  - "sacar al estante" se cierra cuando ya hay producto en el estante (o ya no hay en el almacén);
 *  - "comprar" se cierra cuando el stock volvió a estar por encima del mínimo.
 * Se llama después de una venta, una extracción o una compra.
 */
export async function cerrarAvisosResueltos(productoIDs: number[]) {
  try {
    let huboCambio = false;

    for (const id of Array.from(new Set(productoIDs))) {
      const pendientes = await prisma.notificacion.findMany({
        where: { productoID: id, estado: ESTADO_PENDIENTE },
        select: { id: true, tipo: true },
      });

      if (pendientes.length === 0) continue;

      const s = await stockDeProducto(id);
      const ids = pendientes
        .filter((n) => {
          if (!s) return true;
          if (n.tipo === "estante_vacio") return s.estante > 0.001 || s.almacen <= 0.001;

          return s.total > 0.001 && s.total >= s.minimo;
        })
        .map((n) => n.id);

      if (ids.length > 0) {
        await prisma.notificacion.updateMany({
          where: { id: { in: ids } },
          data: { estado: ESTADO_RESUELTA, fechaCierre: getBoliviaTime() },
        });
        huboCambio = true;
      }
    }

    if (huboCambio) avisarCambio();
  } catch (error) {
    console.error("Error al cerrar avisos resueltos:", error);
  }
}
