"use server";

import { crearAviso, ESTADO_DESCARTADA, ESTADO_PENDIENTE, avisarCambio, TipoNotificacion } from "@/src/lib/notifications";
import { prisma } from "@/src/lib/prisma";
import { enAlmacenDelLote, MOV_DEL_LOTE } from "@/src/lib/stock-almacen";
import { getBoliviaTime } from "@/src/utils/date";
import { addDays } from "@/src/utils/report-dates";

export type NotificacionItem = {
  id: number;
  tipo: TipoNotificacion;
  rolDestino: number;
  productoID: number;
  titulo: string;
  mensaje: string;
  enlace: string | null;
  fecha: string; // ISO
};

export type NivelEstante = "agotado" | "por_acabarse" | "sin_reposicion";

export type ProductoEstante = {
  id: number;
  nombre: string;
  categoria: string;
  unidad: string;
  estante: number;
  almacen: number;
  minimo: number;
  cobertura: number | null; // días que dura lo que hay en el estante al ritmo de venta
  nivel: NivelEstante;
  /** Qué aviso corresponde: sacar del almacén o comprar */
  accion: TipoNotificacion;
  avisoEnviado: boolean;
};

/** Solo el cajero y el administrador pueden enviar avisos */
export async function enviarAvisoProducto(input: { tipo: TipoNotificacion; productoID: number; usuarioId: number }) {
  try {
    const persona = await prisma.persona.findFirst({ where: { id: input.usuarioId, estado: 1 }, select: { rol: true } });

    if (!persona || ![1, 2].includes(persona.rol)) {
      return { success: false, error: "Solo el cajero y el administrador pueden enviar avisos." };
    }

    return await crearAviso(input.tipo, input.productoID, input.usuarioId);
  } catch (error) {
    console.error("Error al enviar el aviso:", error);

    return { success: false, error: "No se pudo enviar el aviso" };
  }
}

/** Cierra una tarea a mano (por ejemplo, si ya se resolvió fuera del sistema) */
export async function descartarNotificacion(id: number, usuarioId: number) {
  try {
    await prisma.notificacion.updateMany({
      where: { id, estado: ESTADO_PENDIENTE },
      data: { estado: ESTADO_DESCARTADA, fechaCierre: getBoliviaTime(), usuarioIdCierre: usuarioId },
    });
    avisarCambio();

    return { success: true };
  } catch (error) {
    console.error("Error al descartar la notificación:", error);

    return { success: false };
  }
}

/**
 * Productos del estante que el cajero debe vigilar: agotados, por acabarse (menos de 3 días de venta)
 * o sin nada que reponer (ni en el almacén). Lo vencido no cuenta como stock.
 */
export async function getEstadoEstante(): Promise<ProductoEstante[]> {
  try {
    const hoy = getBoliviaTime().toISOString().slice(0, 10);
    const inicioHoy = new Date(`${hoy}T00:00:00.000Z`);
    const desde = new Date(`${addDays(hoy, -29)}T00:00:00.000Z`);
    const noVencido = [{ fechaVencimiento: null }, { fechaVencimiento: { gte: inicioHoy } }];

    const [productos, estantes, lotes, ventas, pendientes] = await Promise.all([
      prisma.producto.findMany({
        where: { estado: 1 },
        select: {
          id: true,
          nombre: true,
          stockMinimo: true,
          Categoria: { select: { nombre: true } },
          UnidadMedida: { select: { abreviatura: true, nombre: true } },
        },
      }),
      prisma.stockVenta.findMany({
        where: { estado: 1, cantidadDisponible: { gt: 0 }, OR: noVencido },
        select: { productoID: true, cantidadUnidadesBase: true },
      }),
      prisma.lote.findMany({
        where: { estado: 1, OR: noVencido },
        select: {
          productoID: true,
          cantidadInicialUnidadesBase: true,
          MovimientoAlmacen: { where: MOV_DEL_LOTE, select: { tipoMovimiento: true, cantidadUnidadesBase: true } },
        },
      }),
      prisma.detalleVenta.findMany({
        where: { Venta: { estado: 1, fechaVenta: { gte: desde } } },
        select: { cantidadUnidadesBase: true, StockVenta: { select: { productoID: true } } },
      }),
      prisma.notificacion.findMany({ where: { estado: ESTADO_PENDIENTE }, select: { productoID: true, tipo: true } }),
    ]);

    const suma = (mapa: Map<number, number>, id: number, v: number) => mapa.set(id, (mapa.get(id) ?? 0) + v);
    const enEstante = new Map<number, number>();
    const enAlmacen = new Map<number, number>();
    const vendido = new Map<number, number>();

    for (const e of estantes) suma(enEstante, e.productoID, Number(e.cantidadUnidadesBase));
    for (const l of lotes) {
      suma(enAlmacen, l.productoID, Math.max(enAlmacenDelLote(l.cantidadInicialUnidadesBase, l.MovimientoAlmacen), 0));
    }
    for (const v of ventas) suma(vendido, v.StockVenta.productoID, Number(v.cantidadUnidadesBase));

    const avisos = new Set(pendientes.map((p) => `${p.productoID}-${p.tipo}`));
    const resultado: ProductoEstante[] = [];

    for (const p of productos) {
      const estante = enEstante.get(p.id) ?? 0;
      const almacen = enAlmacen.get(p.id) ?? 0;
      const minimo = Number(p.stockMinimo);
      const ventaDiaria = (vendido.get(p.id) ?? 0) / 30;
      const cobertura = ventaDiaria > 0 ? estante / ventaDiaria : null;
      let nivel: NivelEstante | null = null;

      if (estante <= 0.001) nivel = "agotado";
      else if (cobertura !== null && cobertura < 3) nivel = "por_acabarse";
      else if (almacen <= 0.001 && estante < minimo) nivel = "sin_reposicion";

      if (!nivel) continue;

      // Con producto en el almacén se pide sacarlo; si no queda, hay que comprar
      const accion: TipoNotificacion = almacen > 0.001 ? "estante_vacio" : "comprar";

      resultado.push({
        id: p.id,
        nombre: p.nombre,
        categoria: p.Categoria.nombre,
        unidad: p.UnidadMedida.abreviatura || p.UnidadMedida.nombre,
        estante,
        almacen,
        minimo,
        cobertura,
        nivel,
        accion,
        avisoEnviado: avisos.has(`${p.id}-${accion}`),
      });
    }

    const peso: Record<NivelEstante, number> = { agotado: 0, por_acabarse: 1, sin_reposicion: 2 };

    return resultado.sort((a, b) => peso[a.nivel] - peso[b.nivel] || (a.cobertura ?? 0) - (b.cobertura ?? 0));
  } catch (error) {
    console.error("Error al obtener el estado del estante:", error);

    return [];
  }
}
