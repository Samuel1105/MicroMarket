"use server";

import { stockDeProducto } from "@/src/lib/notifications";
import { prisma } from "@/src/lib/prisma";
import { getBoliviaTime } from "@/src/utils/date";

/**
 * Solicitudes de compra (como las cotizaciones en borrador de Odoo): productos que hay que comprar
 * y que Compras todavía no confirmó. Hay una solicitud abierta por proveedor: si ya existe, los
 * productos nuevos se suman a ella.
 */

const ESTADO_PENDIENTE = 0;
const ESTADO_CANCELADA = 2;

export type ProductoSolicitud = {
  detalleId: number;
  id: number;
  nombre: string;
  unidad: string;
  estante: number;
  almacen: number;
  minimo: number;
};

export type SolicitudResumen = {
  id: number;
  numero: string;
  proveedor: { id: number; nombre: string };
  fecha: string; // ISO
  solicitante: string;
  productos: ProductoSolicitud[];
};

async function puedeGestionar(usuarioId: number) {
  const p = await prisma.persona.findFirst({ where: { id: usuarioId, estado: 1 }, select: { rol: true } });

  return !!p && [1, 5].includes(p.rol);
}

/** Crea (o completa) las solicitudes abiertas de los proveedores de esos productos */
export async function crearSolicitudes(input: { productoIDs: number[]; usuarioId: number }) {
  try {
    if (!(await puedeGestionar(input.usuarioId))) {
      return { success: false as const, error: "Solo Compras y el administrador pueden armar una compra." };
    }

    const ids = Array.from(new Set(input.productoIDs));

    if (ids.length === 0) return { success: false as const, error: "No hay productos para comprar." };

    const productos = await prisma.producto.findMany({
      where: { id: { in: ids }, estado: 1 },
      select: { id: true, proveedorID: true },
    });
    const porProveedor = new Map<number, number[]>();

    for (const p of productos) porProveedor.set(p.proveedorID, [...(porProveedor.get(p.proveedorID) ?? []), p.id]);

    const solicitudIDs: number[] = [];

    for (const [proveedorID, prodIDs] of Array.from(porProveedor.entries())) {
      let solicitud = await prisma.solicitudCompra.findFirst({
        where: { proveedorID, estado: ESTADO_PENDIENTE },
        orderBy: { fechaRegistro: "desc" },
        include: { Detalle: { select: { productoID: true } } },
      });

      if (!solicitud) {
        const creada = await prisma.solicitudCompra.create({
          data: { numero: "", proveedorID, estado: ESTADO_PENDIENTE, fechaRegistro: getBoliviaTime(), usuarioIdRegistro: input.usuarioId },
        });
        const fecha = getBoliviaTime().toISOString().slice(0, 10).replace(/-/g, "");

        await prisma.solicitudCompra.update({ where: { id: creada.id }, data: { numero: `SOL-${fecha}-${creada.id}` } });
        solicitud = { ...creada, numero: "", Detalle: [] };
      }

      const yaEstan = new Set(solicitud.Detalle.map((d) => d.productoID));
      const nuevos = prodIDs.filter((id) => !yaEstan.has(id));

      if (nuevos.length > 0) {
        await prisma.solicitudCompraDetalle.createMany({ data: nuevos.map((productoID) => ({ solicitudID: solicitud!.id, productoID })) });
      }
      solicitudIDs.push(solicitud.id);
    }

    return { success: true as const, solicitudIDs };
  } catch (error) {
    console.error("Error al crear la solicitud de compra:", error);

    return { success: false as const, error: "No se pudo armar la solicitud de compra" };
  }
}

export async function getSolicitudesPendientes(): Promise<SolicitudResumen[]> {
  try {
    const solicitudes = await prisma.solicitudCompra.findMany({
      where: { estado: ESTADO_PENDIENTE },
      orderBy: { fechaRegistro: "desc" },
      include: {
        Proveedor: { select: { id: true, nombre: true } },
        Detalle: { select: { id: true, productoID: true } },
      },
    });
    const personas = await prisma.persona.findMany({
      where: { id: { in: Array.from(new Set(solicitudes.map((s) => s.usuarioIdRegistro))) } },
      select: { id: true, primerNombre: true, apellidoPaterno: true },
    });
    const nombres = new Map(personas.map((p) => [p.id, `${p.primerNombre} ${p.apellidoPaterno}`]));

    const resultado: SolicitudResumen[] = [];

    for (const s of solicitudes) {
      const productos: ProductoSolicitud[] = [];

      for (const d of s.Detalle) {
        const st = await stockDeProducto(d.productoID);

        if (st) productos.push({ detalleId: d.id, id: d.productoID, nombre: st.nombre, unidad: st.unidad, estante: st.estante, almacen: st.almacen, minimo: st.minimo });
      }

      resultado.push({
        id: s.id,
        numero: s.numero,
        proveedor: s.Proveedor,
        fecha: s.fechaRegistro.toISOString(),
        solicitante: nombres.get(s.usuarioIdRegistro) ?? "—",
        productos,
      });
    }

    return resultado;
  } catch (error) {
    console.error("Error al listar las solicitudes de compra:", error);

    return [];
  }
}

/** Datos para llenar el formulario de compra desde una solicitud */
/**
 * Cómo se compró cada producto la última vez (unidad, cantidad y precio unitario), para que al armar una compra
 * desde un aviso Compras solo corrija lo que cambió (normalmente, el precio). Cuenta compras recibidas y por recibir.
 */
export async function getUltimaCompraPorProducto(productoIDs: number[]) {
  const mapa: Record<number, { unidadMedidaID: number; cantidad: number; precioUnitario: number }> = {};

  try {
    if (productoIDs.length === 0) return mapa;
    const filas = await prisma.detalleCompra.findMany({
      where: { estado: 1, productoID: { in: productoIDs }, Compra: { estado: { in: [1, 3] } } },
      orderBy: { id: "desc" },
      select: { productoID: true, unidadMedidaID: true, cantidadComprada: true, precioUnitario: true },
    });

    for (const f of filas) {
      if (mapa[f.productoID]) continue; // la primera fila de cada producto es la más reciente
      mapa[f.productoID] = { unidadMedidaID: f.unidadMedidaID, cantidad: Number(f.cantidadComprada), precioUnitario: Number(f.precioUnitario) };
    }
  } catch (error) {
    console.error("Error al leer la última compra de los productos:", error);
  }

  return mapa;
}

export async function getSolicitudParaCompra(id: number) {
  try {
    const s = await prisma.solicitudCompra.findFirst({
      where: { id, estado: ESTADO_PENDIENTE },
      include: { Detalle: { select: { productoID: true } } },
    });

    if (!s) return null;

    return { id: s.id, numero: s.numero, proveedorID: s.proveedorID, productoIDs: s.Detalle.map((d) => d.productoID) };
  } catch (error) {
    console.error("Error al leer la solicitud de compra:", error);

    return null;
  }
}

export async function quitarProductoDeSolicitud(input: { detalleId: number; usuarioId: number }) {
  try {
    if (!(await puedeGestionar(input.usuarioId))) return { success: false };

    const d = await prisma.solicitudCompraDetalle.findUnique({ where: { id: input.detalleId }, select: { solicitudID: true } });

    if (!d) return { success: true };
    await prisma.solicitudCompraDetalle.delete({ where: { id: input.detalleId } });

    // Una solicitud sin productos ya no tiene sentido
    const quedan = await prisma.solicitudCompraDetalle.count({ where: { solicitudID: d.solicitudID } });

    if (quedan === 0) {
      await prisma.solicitudCompra.update({ where: { id: d.solicitudID }, data: { estado: ESTADO_CANCELADA, fechaCierre: getBoliviaTime() } });
    }

    return { success: true };
  } catch (error) {
    console.error("Error al quitar el producto de la solicitud:", error);

    return { success: false };
  }
}

export async function cancelarSolicitud(input: { id: number; usuarioId: number }) {
  try {
    if (!(await puedeGestionar(input.usuarioId))) return { success: false };
    await prisma.solicitudCompra.updateMany({
      where: { id: input.id, estado: ESTADO_PENDIENTE },
      data: { estado: ESTADO_CANCELADA, fechaCierre: getBoliviaTime() },
    });

    return { success: true };
  } catch (error) {
    console.error("Error al cancelar la solicitud:", error);

    return { success: false };
  }
}
