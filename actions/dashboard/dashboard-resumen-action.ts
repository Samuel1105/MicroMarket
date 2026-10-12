"use server";

import { getWarehouseInventory } from "@/actions/reportes/reporte-almacen";
import { prisma } from "@/src/lib/prisma";
import { getBoliviaTime } from "@/src/utils/date";
import { addDays, rangoReporte } from "@/src/utils/report-dates";

export type ResumenDashboard = {
  ventasHoy: { total: number; numero: number };
  ventasAyer: number;
  mes: { total: number; anterior: number }; // el anterior, hasta el mismo día del mes
  inventario: { porReponer: number; sinStock: number; valorPorVencer: number; valorVencido: number } | null;
};

async function sumar(desde: string, hasta: string) {
  const r = rangoReporte(desde, hasta);
  const ventas = await prisma.venta.findMany({
    where: { estado: 1, fechaVenta: { gte: r.startDate, lte: r.endDate } },
    select: { total: true },
  });

  return { total: ventas.reduce((s, v) => s + Number(v.total), 0), numero: ventas.length };
}

export async function getResumenDashboard(): Promise<ResumenDashboard> {
  const hoy = getBoliviaTime().toISOString().slice(0, 10);
  const [y, m, d] = hoy.split("-").map(Number);
  const inicioMes = `${y}-${String(m).padStart(2, "0")}-01`;
  // Mismo tramo del mes anterior (del 1 al mismo día) para comparar con justicia
  const finAnterior = new Date(Date.UTC(y, m - 2, 1));
  const diasMesAnterior = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
  const inicioAnterior = finAnterior.toISOString().slice(0, 10);
  const hastaAnterior = addDays(inicioAnterior, Math.min(d, diasMesAnterior) - 1);

  const [hoyV, ayer, mes, anterior, almacen] = await Promise.all([
    sumar(hoy, hoy),
    sumar(addDays(hoy, -1), addDays(hoy, -1)),
    sumar(inicioMes, hoy),
    sumar(inicioAnterior, hastaAnterior),
    getWarehouseInventory(),
  ]);
  const t = almacen.success ? almacen.data?.totales : undefined;

  return {
    ventasHoy: hoyV,
    ventasAyer: ayer.total,
    mes: { total: mes.total, anterior: anterior.total },
    inventario: t
      ? { porReponer: t.sinStock + t.bajo, sinStock: t.sinStock, valorPorVencer: t.valorPorVencer, valorVencido: t.valorVencidoSinRetirar }
      : null,
  };
}
