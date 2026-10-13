"use server";
import { avisarCambio, cerrarAvisosResueltos } from "@/src/lib/notifications";
import { prisma } from "@/src/lib/prisma";
import {
  enAlmacenDelLote,
  MOTIVOS_AJUSTE,
  MOV_AJUSTE_ALMACEN,
  MOV_AJUSTE_ESTANTE,
  MOV_DEL_LOTE,
  REF_AJUSTE,
} from "@/src/lib/stock-almacen";
import { getBoliviaTime, hoyBolivia } from "@/src/utils/date";

/**
 * Ajuste de inventario: corregir el stock de un lote (almacén) o de un producto en el estante,
 * dejando constancia en el historial (MovimientoAlmacen tipo 3 = almacén, tipo 4 = estante) con
 * motivo, comentario, usuario y fecha. Solo Administrador (1) y Almacén (3).
 */

const ROLES_AJUSTE = [1, 3];
const redondear = (n: number) => Math.round(n * 100) / 100;
const num = (n: unknown) => Number(n ?? 0);

export type ProductoAjuste = {
  id: number;
  nombre: string;
  categoria: string;
  unidadBase: string;
  almacen: number; // unidades base en el almacén (sin lo vencido)
  estante: number; // unidades base en el estante (sin lo vencido)
};

export type LoteAjuste = {
  loteId: number;
  numeroLote: string;
  fechaVencimiento: string | null;
  vencido: boolean;
  enAlmacen: number; // unidades base
};

export type EstanteAjuste = {
  stockVentaId: number;
  lote: string | null;
  unidad: string;
  cantidad: number; // en la unidad del propio stock
  cantidadBase: number;
  precio: number;
  fechaVencimiento: string | null;
  vencido: boolean;
  codigosActivos: number;
};

export type UbicacionesAjuste = {
  producto: { id: number; nombre: string; unidadBase: string };
  lotes: LoteAjuste[];
  estante: EstanteAjuste[];
};

async function rolDe(usuarioId: number) {
  const p = await prisma.persona.findFirst({ where: { id: usuarioId, estado: 1 }, select: { rol: true } });

  return p?.rol ?? null;
}

const dia = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

/** Productos activos con cuánto hay de cada uno en almacén y estante */
export async function getProductosParaAjuste(): Promise<{ success: boolean; data: ProductoAjuste[]; error?: string }> {
  try {
    const hoy = hoyBolivia();
    const [productos, lotes, estantes] = await Promise.all([
      prisma.producto.findMany({
        where: { estado: 1 },
        select: {
          id: true,
          nombre: true,
          Categoria: { select: { nombre: true } },
          UnidadMedida: { select: { abreviatura: true, nombre: true } },
        },
        orderBy: { nombre: "asc" },
      }),
      prisma.lote.findMany({
        where: { estado: 1 },
        select: {
          productoID: true,
          fechaVencimiento: true,
          cantidadInicialUnidadesBase: true,
          MovimientoAlmacen: { where: MOV_DEL_LOTE, select: { tipoMovimiento: true, cantidadUnidadesBase: true } },
        },
      }),
      prisma.stockVenta.findMany({
        where: { estado: 1, cantidadDisponible: { gt: 0 } },
        select: { productoID: true, fechaVencimiento: true, cantidadUnidadesBase: true },
      }),
    ]);

    const almacen = new Map<number, number>();
    const estante = new Map<number, number>();

    for (const l of lotes) {
      if (l.fechaVencimiento && dia(l.fechaVencimiento)! < hoy) continue;
      const q = Math.max(enAlmacenDelLote(l.cantidadInicialUnidadesBase, l.MovimientoAlmacen), 0);

      almacen.set(l.productoID, (almacen.get(l.productoID) ?? 0) + q);
    }
    for (const s of estantes) {
      if (s.fechaVencimiento && dia(s.fechaVencimiento)! < hoy) continue;
      estante.set(s.productoID, (estante.get(s.productoID) ?? 0) + num(s.cantidadUnidadesBase));
    }

    return {
      success: true,
      data: productos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        categoria: p.Categoria.nombre,
        unidadBase: p.UnidadMedida.abreviatura || p.UnidadMedida.nombre,
        almacen: redondear(almacen.get(p.id) ?? 0),
        estante: redondear(estante.get(p.id) ?? 0),
      })),
    };
  } catch (error) {
    console.error("Error al listar productos para ajuste:", error);

    return { success: false, data: [], error: "No se pudieron cargar los productos" };
  }
}

/** Lotes (almacén) y stocks (estante) de un producto, con lo que hay ahora */
export async function getUbicacionesAjuste(productoId: number): Promise<{ success: boolean; data?: UbicacionesAjuste; error?: string }> {
  try {
    const hoy = hoyBolivia();
    const producto = await prisma.producto.findUnique({
      where: { id: productoId },
      select: { id: true, nombre: true, UnidadMedida: { select: { abreviatura: true, nombre: true } } },
    });

    if (!producto) return { success: false, error: "El producto no existe" };

    const [lotes, stocks] = await Promise.all([
      prisma.lote.findMany({
        where: { productoID: productoId, estado: 1 },
        select: {
          id: true,
          numeroLote: true,
          fechaVencimiento: true,
          cantidadInicialUnidadesBase: true,
          MovimientoAlmacen: { where: MOV_DEL_LOTE, select: { tipoMovimiento: true, cantidadUnidadesBase: true } },
        },
        orderBy: [{ fechaVencimiento: "asc" }, { id: "asc" }],
      }),
      prisma.stockVenta.findMany({
        where: { productoID: productoId, estado: 1, cantidadDisponible: { gt: 0 } },
        select: {
          id: true,
          cantidadDisponible: true,
          cantidadUnidadesBase: true,
          precioVenta: true,
          fechaVencimiento: true,
          Lote: { select: { numeroLote: true } },
          UnidadMedida: { select: { abreviatura: true, nombre: true } },
          CodigoBarrasItem: { where: { estado: 1 }, select: { id: true } },
        },
        orderBy: { id: "asc" },
      }),
    ]);

    return {
      success: true,
      data: {
        producto: {
          id: producto.id,
          nombre: producto.nombre,
          unidadBase: producto.UnidadMedida.abreviatura || producto.UnidadMedida.nombre,
        },
        lotes: lotes.map((l) => ({
          loteId: l.id,
          numeroLote: l.numeroLote,
          fechaVencimiento: dia(l.fechaVencimiento),
          vencido: !!l.fechaVencimiento && dia(l.fechaVencimiento)! < hoy,
          enAlmacen: redondear(Math.max(enAlmacenDelLote(l.cantidadInicialUnidadesBase, l.MovimientoAlmacen), 0)),
        })),
        estante: stocks.map((s) => ({
          stockVentaId: s.id,
          lote: s.Lote?.numeroLote ?? null,
          unidad: s.UnidadMedida.abreviatura || s.UnidadMedida.nombre,
          cantidad: num(s.cantidadDisponible),
          cantidadBase: num(s.cantidadUnidadesBase),
          precio: num(s.precioVenta),
          fechaVencimiento: dia(s.fechaVencimiento),
          vencido: !!s.fechaVencimiento && dia(s.fechaVencimiento)! < hoy,
          codigosActivos: s.CodigoBarrasItem.length,
        })),
      },
    };
  } catch (error) {
    console.error("Error al cargar ubicaciones del producto:", error);

    return { success: false, error: "No se pudo cargar el stock del producto" };
  }
}

export type AjusteRequest = {
  ubicacion: "almacen" | "estante";
  /** Lote (almacén) o StockVenta (estante) que se ajusta */
  referenciaId: number;
  /** Cantidad real contada: unidades base en el almacén, o la unidad del propio stock en el estante */
  cantidadReal: number;
  /** Cantidad que la pantalla mostraba antes de ajustar; si ya cambió, se pide recargar */
  cantidadVista: number;
  motivo: string;
  comentario: string;
  usuarioId: number;
};

export async function ajustarInventario(req: AjusteRequest) {
  try {
    const rol = await rolDe(req.usuarioId);

    if (rol === null || !ROLES_AJUSTE.includes(rol)) {
      return { success: false as const, error: "Solo el Administrador y el Gestor de Almacén pueden ajustar el inventario." };
    }
    if (!(MOTIVOS_AJUSTE as readonly string[]).includes(req.motivo)) {
      return { success: false as const, error: "Elige un motivo válido." };
    }

    const comentario = (req.comentario ?? "").trim();

    if (comentario.length < 3) return { success: false as const, error: "Escribe un comentario que explique el ajuste." };
    if (comentario.length > 150) return { success: false as const, error: "El comentario es demasiado largo (máximo 150 caracteres)." };
    if (!Number.isFinite(req.cantidadReal) || req.cantidadReal < 0) {
      return { success: false as const, error: "La cantidad real debe ser 0 o mayor." };
    }

    const real = redondear(req.cantidadReal);
    const observaciones = `${req.motivo} · ${comentario}`;
    const hoy = hoyBolivia();

    const resultado = await prisma.$transaction(async (tx) => {
      if (req.ubicacion === "almacen") {
        const lote = await tx.lote.findUnique({
          where: { id: req.referenciaId },
          select: {
            id: true,
            estado: true,
            productoID: true,
            fechaVencimiento: true,
            cantidadInicialUnidadesBase: true,
            Producto: { select: { unidadBaseID: true } },
            MovimientoAlmacen: { where: MOV_DEL_LOTE, select: { tipoMovimiento: true, cantidadUnidadesBase: true } },
          },
        });

        if (!lote || lote.estado !== 1) throw new Error("El lote no existe.");

        const actual = redondear(enAlmacenDelLote(lote.cantidadInicialUnidadesBase, lote.MovimientoAlmacen));

        if (Math.abs(actual - redondear(req.cantidadVista)) > 0.005) {
          throw new Error("El stock de este lote cambió mientras ajustabas. Recarga la pantalla y vuelve a intentarlo.");
        }

        const diferencia = redondear(real - actual);

        if (Math.abs(diferencia) < 0.005) throw new Error("La cantidad real es igual a la actual: no hay nada que ajustar.");
        if (diferencia > 0 && lote.fechaVencimiento && dia(lote.fechaVencimiento)! < hoy) {
          throw new Error("Un lote vencido solo admite bajas (cantidad menor a la actual).");
        }

        const mov = await tx.movimientoAlmacen.create({
          data: {
            tipoMovimiento: MOV_AJUSTE_ALMACEN,
            productoID: lote.productoID,
            loteID: lote.id,
            unidadMedidaID: lote.Producto.unidadBaseID,
            cantidad: diferencia,
            cantidadUnidadesBase: diferencia,
            tipoReferencia: REF_AJUSTE,
            observaciones,
            fechaRegistro: getBoliviaTime(),
            usuarioIdRegistro: req.usuarioId,
          },
        });

        return { movimientoId: mov.id, productoId: lote.productoID, diferencia, nueva: real };
      }

      // ── Estante ──
      const stock = await tx.stockVenta.findUnique({
        where: { id: req.referenciaId },
        select: {
          id: true,
          estado: true,
          productoID: true,
          loteID: true,
          unidadMedidaID: true,
          fechaVencimiento: true,
          cantidadDisponible: true,
          cantidadUnidadesBase: true,
        },
      });

      if (!stock || stock.estado !== 1) throw new Error("Ese producto ya no está en el estante.");

      const actual = redondear(num(stock.cantidadDisponible));

      if (Math.abs(actual - redondear(req.cantidadVista)) > 0.005) {
        throw new Error("El stock del estante cambió mientras ajustabas (¿se hizo una venta?). Recarga la pantalla y vuelve a intentarlo.");
      }

      const diferencia = redondear(real - actual);

      if (Math.abs(diferencia) < 0.005) throw new Error("La cantidad real es igual a la actual: no hay nada que ajustar.");
      if (diferencia > 0 && stock.fechaVencimiento && dia(stock.fechaVencimiento)! < hoy) {
        throw new Error("Un producto vencido solo admite bajas (cantidad menor a la actual).");
      }

      // Cuántas unidades base vale cada unidad de este stock
      const factor = actual > 0 ? num(stock.cantidadUnidadesBase) / actual : 1;
      const diferenciaBase = redondear(diferencia * factor);
      const nuevaBase = real <= 0 ? 0 : Math.max(redondear(num(stock.cantidadUnidadesBase) + diferenciaBase), 0);

      await tx.stockVenta.update({
        where: { id: stock.id },
        data: { cantidadDisponible: real, cantidadUnidadesBase: nuevaBase, estado: real <= 0 ? 2 : 1 },
      });

      // Si quedan menos unidades que códigos de barras disponibles, los sobrantes se dan de baja (estado 3)
      if (diferencia < 0) {
        const codigos = await tx.codigoBarrasItem.findMany({ where: { stockVentaID: stock.id, estado: 1 }, select: { id: true }, orderBy: { id: "desc" } });
        const maximo = Math.floor(real + 1e-9);

        if (codigos.length > maximo) {
          await tx.codigoBarrasItem.updateMany({
            where: { id: { in: codigos.slice(0, codigos.length - maximo).map((c) => c.id) } },
            data: { estado: 3 },
          });
        }
      }

      const mov = await tx.movimientoAlmacen.create({
        data: {
          tipoMovimiento: MOV_AJUSTE_ESTANTE,
          productoID: stock.productoID,
          loteID: stock.loteID,
          unidadMedidaID: stock.unidadMedidaID,
          cantidad: diferencia,
          cantidadUnidadesBase: diferenciaBase,
          tipoReferencia: REF_AJUSTE,
          referenciaID: stock.id,
          observaciones,
          fechaRegistro: getBoliviaTime(),
          usuarioIdRegistro: req.usuarioId,
        },
      });

      return { movimientoId: mov.id, productoId: stock.productoID, diferencia, nueva: real };
    });

    await cerrarAvisosResueltos([resultado.productoId]);
    avisarCambio();

    return { success: true as const, data: resultado };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "No se pudo registrar el ajuste." };
  }
}
