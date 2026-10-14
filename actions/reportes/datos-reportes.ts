"use server";

import { Prisma } from "@prisma/client";

import { prisma } from "@/src/lib/prisma";
import { getCostoPromedioBase } from "@/src/lib/report-cost";
import { cargarVencidos, VencidoDetalle } from "@/src/lib/report-vencidos";
import { getRoleName } from "@/src/utils/rolesName";
import { diasEnRango, rangoAnterior, rangoReporte } from "@/src/utils/report-dates";

/**
 * Datos de ventas "crudos" que comparten los reportes interactivos.
 *
 * Se manda una fila por producto vendido (detalle de venta) y la pantalla suma lo que necesite según los
 * filtros que elija la persona (vendedor, cliente, producto, categoría…). Para que pese poco, las filas son
 * listas de números que apuntan a los diccionarios de productos, clientes y vendedores.
 *
 * Fila = [ventaId, segundos(fecha), vendedor, cliente, producto, cantidadBase, importe, descuento, costo]
 */
export type Fila = [number, number, number, number, number, number, number, number, number];

export type ProductoDic = { id: number; nombre: string; categoria: string; unidad: string; proveedor: string };
export type ClienteDic = { id: number; nombre: string; carnet: string; general: boolean };
export type VendedorDic = { id: number; nombre: string; rol: string };

export type DatosVentas = {
  rango: { start: string; end: string; dias: number };
  productos: ProductoDic[];
  clientes: ClienteDic[];
  vendedores: VendedorDic[];
  filas: Fila[];
  previas: Fila[];
  /** Si había más filas que el límite, se mandan las más recientes */
  recortado: boolean;
  /** Productos vendidos sin compras registradas (su costo cuenta 0) y productos con más ventas que compras */
  avisos: { sinCosto: string[]; vendidosDeMas: string[] };
};

/** Carnet reservado para las ventas rápidas sin datos */
const CARNET_GENERAL = "0";
const LIMITE_FILAS = 60000;

type Respuesta<T> = { success: boolean; data?: T; error?: string };
type Params = { startDate: string; endDate: string };

export async function getVentasDatos({ startDate, endDate }: Params): Promise<Respuesta<DatosVentas>> {
  try {
    const actual = rangoReporte(startDate, endDate);
    const prev = rangoAnterior(startDate, endDate);
    const previo = rangoReporte(prev.start, prev.end);

    // Un solo costo promedio (al cierre del período) para ambos períodos: la comparación no se distorsiona
    const costos = await getCostoPromedioBase(actual.endDate);

    const consulta = (start: Date, end: Date) =>
      prisma.detalleVenta.findMany({
        where: { Venta: { estado: 1, fechaVenta: { gte: start, lte: end } } },
        select: {
          ventaID: true,
          total: true,
          descuento: true,
          cantidadUnidadesBase: true,
          StockVenta: {
            select: {
              productoID: true,
              Producto: {
                select: {
                  nombre: true,
                  Categoria: { select: { nombre: true } },
                  Proveedor: { select: { nombre: true } },
                  UnidadMedida: { select: { abreviatura: true, nombre: true } },
                },
              },
            },
          },
          Venta: {
            select: {
              fechaVenta: true,
              usuarioRegistro: true,
              Cliente: { select: { id: true, nombre: true, carnet: true } },
            },
          },
        },
      });

    const [det, detPrev, personas] = await Promise.all([
      consulta(actual.startDate, actual.endDate),
      consulta(previo.startDate, previo.endDate),
      prisma.persona.findMany({
        where: { estado: 1 },
        select: { id: true, primerNombre: true, apellidoPaterno: true, rol: true },
      }),
    ]);

    const productos: ProductoDic[] = [];
    const clientes: ClienteDic[] = [];
    const vendedores: VendedorDic[] = [];
    const idxProducto = new Map<number, number>();
    const idxCliente = new Map<number, number>();
    const idxVendedor = new Map<number, number>();
    const nombres = new Map(personas.map((p) => [p.id, { nombre: `${p.primerNombre} ${p.apellidoPaterno}`, rol: getRoleName(p.rol) }]));

    // Los cajeros y administradores salen siempre en la lista, aunque no hayan vendido
    for (const p of personas) {
      if (p.rol === 1 || p.rol === 2) {
        idxVendedor.set(p.id, vendedores.length);
        vendedores.push({ id: p.id, nombre: `${p.primerNombre} ${p.apellidoPaterno}`, rol: getRoleName(p.rol) });
      }
    }

    const fila = (d: (typeof det)[number]): Fila | null => {
      const v = d.Venta;

      if (!v.fechaVenta) return null;
      const pid = d.StockVenta.productoID;
      const prod = d.StockVenta.Producto;

      if (!idxProducto.has(pid)) {
        idxProducto.set(pid, productos.length);
        productos.push({
          id: pid,
          nombre: prod.nombre,
          categoria: prod.Categoria.nombre,
          unidad: prod.UnidadMedida.abreviatura || prod.UnidadMedida.nombre,
          proveedor: prod.Proveedor.nombre,
        });
      }

      if (!idxCliente.has(v.Cliente.id)) {
        idxCliente.set(v.Cliente.id, clientes.length);
        clientes.push({ id: v.Cliente.id, nombre: v.Cliente.nombre, carnet: v.Cliente.carnet, general: v.Cliente.carnet === CARNET_GENERAL });
      }

      if (!idxVendedor.has(v.usuarioRegistro)) {
        idxVendedor.set(v.usuarioRegistro, vendedores.length);
        vendedores.push({
          id: v.usuarioRegistro,
          nombre: nombres.get(v.usuarioRegistro)?.nombre ?? `Usuario ${v.usuarioRegistro}`,
          rol: nombres.get(v.usuarioRegistro)?.rol ?? "",
        });
      }

      const unidades = Number(d.cantidadUnidadesBase);

      return [
        d.ventaID,
        Math.floor(v.fechaVenta.getTime() / 1000),
        idxVendedor.get(v.usuarioRegistro)!,
        idxCliente.get(v.Cliente.id)!,
        idxProducto.get(pid)!,
        unidades,
        Number(d.total),
        Number(d.descuento ?? 0),
        unidades * (costos.get(pid)?.costoUnidad ?? 0),
      ];
    };

    let filas = det.map(fila).filter((f): f is Fila => f !== null);
    const previas = detPrev.map(fila).filter((f): f is Fila => f !== null);
    const recortado = filas.length > LIMITE_FILAS;

    if (recortado) filas = filas.sort((a, b) => b[1] - a[1]).slice(0, LIMITE_FILAS);

    // Avisos de calidad de datos (período actual)
    const sinCosto = new Set<string>();
    const vendidas = new Map<number, { nombre: string; unidades: number }>();

    for (const d of det) {
      const pid = d.StockVenta.productoID;

      if (!costos.get(pid)) sinCosto.add(d.StockVenta.Producto.nombre);
      const v = vendidas.get(pid) ?? { nombre: d.StockVenta.Producto.nombre, unidades: 0 };

      v.unidades += Number(d.cantidadUnidadesBase);
      vendidas.set(pid, v);
    }

    const vendidosDeMas = Array.from(vendidas.entries())
      .filter(([id, v]) => {
        const c = costos.get(id);

        return c !== undefined && v.unidades > c.unidadesCompradas + 0.001;
      })
      .map(([, v]) => v.nombre);

    return {
      success: true,
      data: {
        rango: { start: startDate, end: endDate, dias: diasEnRango(startDate, endDate) },
        productos,
        clientes,
        vendedores,
        filas,
        previas,
        recortado,
        avisos: { sinCosto: Array.from(sinCosto), vendidosDeMas },
      },
    };
  } catch (error) {
    console.error("Error en getVentasDatos:", error);

    return { success: false, error: "Error al cargar las ventas" };
  }
}

// ───────────────────────── Compras y mercadería vencida (Estado financiero, Rentabilidad) ─────────────────────────

/** Fila de compra: [segundos(fecha), proveedor, producto, categoría, total] */
export type FilaCompra = { f: number; proveedor: string; producto: string; categoria: string; total: number };

export type DatosFinanzas = {
  compras: FilaCompra[];
  comprasPrev: FilaCompra[];
  vencidos: VencidoDetalle[];
  vencidosPrev: VencidoDetalle[];
};

export async function getFinanzasDatos({ startDate, endDate }: Params): Promise<Respuesta<DatosFinanzas>> {
  try {
    const actual = rangoReporte(startDate, endDate);
    const prev = rangoAnterior(startDate, endDate);
    const previo = rangoReporte(prev.start, prev.end);

    const compras = (start: Date, end: Date) =>
      prisma.detalleCompra.findMany({
        where: { estado: 1, Compra: { estado: 1, fechaRegistro: { gte: start, lte: end } } },
        select: {
          total: true,
          Compra: { select: { fechaRegistro: true, Proveedor: { select: { nombre: true } } } },
          Producto: { select: { nombre: true, Categoria: { select: { nombre: true } } } },
        },
      });

    const aFila = (d: Awaited<ReturnType<typeof compras>>[number]): FilaCompra | null =>
      d.Compra.fechaRegistro
        ? {
            f: Math.floor(d.Compra.fechaRegistro.getTime() / 1000),
            proveedor: d.Compra.Proveedor.nombre,
            producto: d.Producto.nombre,
            categoria: d.Producto.Categoria.nombre,
            total: Number(d.total),
          }
        : null;

    const [c, cPrev, vencidos, vencidosPrev] = await Promise.all([
      compras(actual.startDate, actual.endDate),
      compras(previo.startDate, previo.endDate),
      cargarVencidos(actual.startDate, actual.endDate),
      cargarVencidos(previo.startDate, previo.endDate),
    ]);

    return {
      success: true,
      data: {
        compras: c.map(aFila).filter((x): x is FilaCompra => x !== null),
        comprasPrev: cPrev.map(aFila).filter((x): x is FilaCompra => x !== null),
        vencidos,
        vencidosPrev,
      },
    };
  } catch (error) {
    console.error("Error en getFinanzasDatos:", error);

    return { success: false, error: "Error al cargar compras y vencimientos" };
  }
}

// ───────────────────────── Catálogo y clientes (Ventas por producto, Análisis de clientes) ─────────────────────────

export type ProductoCatalogo = { id: number; nombre: string; categoria: string; ultimaVenta: string | null };

export type ClienteHistorial = {
  id: number;
  nombre: string;
  carnet: string;
  correo: string;
  primera: string; // YYYY-MM-DD
  ultima: string; // YYYY-MM-DD
  compras: number;
  gasto: number;
};

export type DatosCatalogo = {
  /** Productos activos con la fecha de su última venta anterior al rango */
  catalogo: ProductoCatalogo[];
  /** Historial de cada cliente identificado hasta el fin del rango (para saber quién es nuevo y quién se fue) */
  clientes: ClienteHistorial[];
};

export async function getCatalogoClientes({ startDate, endDate }: Params): Promise<Respuesta<DatosCatalogo>> {
  try {
    const actual = rangoReporte(startDate, endDate);

    const [productos, ultimas, hist] = await Promise.all([
      prisma.producto.findMany({ where: { estado: 1 }, select: { id: true, nombre: true, Categoria: { select: { nombre: true } } } }),
      prisma.$queryRaw<Array<{ productoID: number; ultima: Date }>>(Prisma.sql`
        SELECT sv.productoID AS productoID, MAX(v.fechaVenta) AS ultima
        FROM DetalleVenta d
        JOIN StockVenta sv ON sv.id = d.stockVentaID
        JOIN Venta v ON v.id = d.ventaID
        WHERE v.estado = 1 AND v.fechaVenta < ${actual.startDate}
        GROUP BY sv.productoID`),
      prisma.venta.groupBy({
        by: ["clienteID"],
        where: { estado: 1, fechaVenta: { lte: actual.endDate }, Cliente: { carnet: { not: CARNET_GENERAL } } },
        _min: { fechaVenta: true },
        _max: { fechaVenta: true },
        _count: { _all: true },
        _sum: { total: true },
      }),
    ]);

    const clientes = await prisma.cliente.findMany({
      where: { id: { in: hist.map((h) => h.clienteID) } },
      select: { id: true, nombre: true, carnet: true, correo: true },
    });
    const info = new Map(clientes.map((c) => [c.id, c]));
    const ultimaPorProducto = new Map(ultimas.map((u) => [Number(u.productoID), new Date(u.ultima).toISOString().slice(0, 10)]));

    return {
      success: true,
      data: {
        catalogo: productos.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          categoria: p.Categoria.nombre,
          ultimaVenta: ultimaPorProducto.get(p.id) ?? null,
        })),
        clientes: hist
          .map((h) => {
            const c = info.get(h.clienteID);

            return c && h._min.fechaVenta && h._max.fechaVenta
              ? {
                  id: c.id,
                  nombre: c.nombre,
                  carnet: c.carnet,
                  correo: c.correo,
                  primera: h._min.fechaVenta.toISOString().slice(0, 10),
                  ultima: h._max.fechaVenta.toISOString().slice(0, 10),
                  compras: h._count._all,
                  gasto: Number(h._sum.total ?? 0),
                }
              : null;
          })
          .filter((x): x is ClienteHistorial => x !== null),
      },
    };
  } catch (error) {
    console.error("Error en getCatalogoClientes:", error);

    return { success: false, error: "Error al cargar el catálogo y los clientes" };
  }
}
