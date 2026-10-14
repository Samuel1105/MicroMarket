import type { ClienteDic, DatosVentas, ProductoDic, VendedorDic } from "@/actions/reportes/datos-reportes";

import { diaDeSegundos, isoDeSegundos } from "./fechas";

/** Una fila de venta ya "armada": un producto vendido dentro de una venta */
export type FilaVenta = {
  venta: number;
  /** Segundos desde 1970 (hora de Bolivia guardada como UTC) */
  ts: number;
  fecha: string; // ISO
  dia: string; // YYYY-MM-DD
  vendedor: VendedorDic;
  cliente: ClienteDic;
  producto: ProductoDic;
  /** Unidades base */
  qty: number;
  importe: number;
  descuento: number;
  costo: number;
};

export function expandir(d: DatosVentas): { filas: FilaVenta[]; previas: FilaVenta[] } {
  const armar = (f: DatosVentas["filas"][number]): FilaVenta => ({
    venta: f[0],
    ts: f[1],
    fecha: isoDeSegundos(f[1]),
    dia: diaDeSegundos(f[1]),
    vendedor: d.vendedores[f[2]],
    cliente: d.clientes[f[3]],
    producto: d.productos[f[4]],
    qty: f[5],
    importe: f[6],
    descuento: f[7],
    costo: f[8],
  });

  return { filas: d.filas.map(armar), previas: d.previas.map(armar) };
}

export type FiltrosVentas = Record<string, string[]>;

/** Aplica los filtros comunes (vendedor, cliente, producto, categoría) a un conjunto de filas */
export function filtrarVentas(filas: FilaVenta[], f: FiltrosVentas): FilaVenta[] {
  const v = f.vendedor?.length ? new Set(f.vendedor) : null;
  const c = f.cliente?.length ? new Set(f.cliente) : null;
  const p = f.producto?.length ? new Set(f.producto) : null;
  const k = f.categoria?.length ? new Set(f.categoria) : null;

  if (!v && !c && !p && !k) return filas;

  return filas.filter(
    (x) =>
      (!v || v.has(String(x.vendedor.id))) &&
      (!c || c.has(String(x.cliente.id))) &&
      (!p || p.has(x.producto.nombre)) &&
      (!k || k.has(x.producto.categoria)),
  );
}

/** Ventas distintas (tickets) dentro de un conjunto de filas */
export const contarVentas = (filas: FilaVenta[]) => new Set(filas.map((x) => x.venta)).size;
export const sumar = (filas: FilaVenta[], f: (x: FilaVenta) => number) => filas.reduce((s, x) => s + f(x), 0);

/** Agrupa filas por una clave y suma importe, ventas distintas y unidades */
export function agrupar(filas: FilaVenta[], clave: (x: FilaVenta) => string) {
  const m = new Map<string, { importe: number; unidades: number; descuento: number; costo: number; ventas: Set<number>; filas: FilaVenta[] }>();

  for (const x of filas) {
    const k = clave(x);
    const a = m.get(k) ?? { importe: 0, unidades: 0, descuento: 0, costo: 0, ventas: new Set<number>(), filas: [] };

    a.importe += x.importe;
    a.unidades += x.qty;
    a.descuento += x.descuento;
    a.costo += x.costo;
    a.ventas.add(x.venta);
    a.filas.push(x);
    m.set(k, a);
  }

  return m;
}

/** Una venta completa (ticket), sumando sus productos ya filtrados */
export type VentaAgg = {
  venta: number;
  ts: number;
  fecha: string;
  dia: string;
  vendedor: FilaVenta["vendedor"];
  cliente: FilaVenta["cliente"];
  importe: number;
  descuento: number;
  costo: number;
  items: number;
};

export function aVentas(filas: FilaVenta[]): VentaAgg[] {
  const m = new Map<number, VentaAgg>();

  for (const x of filas) {
    const a = m.get(x.venta);

    if (a) {
      a.importe += x.importe;
      a.descuento += x.descuento;
      a.costo += x.costo;
      a.items += 1;
    } else {
      m.set(x.venta, {
        venta: x.venta,
        ts: x.ts,
        fecha: x.fecha,
        dia: x.dia,
        vendedor: x.vendedor,
        cliente: x.cliente,
        importe: x.importe,
        descuento: x.descuento,
        costo: x.costo,
        items: 1,
      });
    }
  }

  return Array.from(m.values());
}
