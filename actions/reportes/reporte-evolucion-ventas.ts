"use server";

import { prisma } from "@/src/lib/prisma";
import { addDays, diaBD, diasEnRango, rangoAnterior, rangoReporte } from "@/src/utils/report-dates";

type Params = { startDate: string; endDate: string };

export type TotalesVentas = {
  ventas: number; // Bs.
  numero: number; // cantidad de ventas
  ticket: number; // Bs. por venta
  descuentos: number; // Bs.
};

export type EvolucionVentasData = {
  rango: { start: string; end: string; dias: number };
  actual: TotalesVentas;
  anterior: TotalesVentas;
  /** Un punto por día del rango, con el día equivalente del período anterior */
  porDia: Array<{ fecha: string; ventas: number; numero: number; ventasAnterior: number }>;
  /** Promedio de ventas (Bs.) que deja cada día de la semana, lunes a domingo */
  porDiaSemana: Array<{ dia: string; promedio: number; total: number; ocurrencias: number }>;
  /** Ventas (Bs.) por hora del día, solo horas con movimiento */
  porHora: Array<{ hora: number; ventas: number; numero: number }>;
  mejorDia: { fecha: string; ventas: number } | null;
  peorDia: { fecha: string; ventas: number } | null;
  diasSinVentas: number;
  /** Ventas de la segunda mitad del período frente a la primera (tendencia dentro del rango) */
  tendencia: number | null;
};

const NOMBRES_DIA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

async function cargar(start: Date, end: Date) {
  return prisma.venta.findMany({
    where: { estado: 1, fechaVenta: { gte: start, lte: end } },
    select: { total: true, descuento: true, fechaVenta: true },
  });
}

function totales(v: Array<{ total: unknown; descuento: unknown }>): TotalesVentas {
  const ventas = v.reduce((s, x) => s + Number(x.total), 0);

  return {
    ventas,
    numero: v.length,
    ticket: v.length ? ventas / v.length : 0,
    descuentos: v.reduce((s, x) => s + Number(x.descuento ?? 0), 0),
  };
}

export async function getSalesEvolution({
  startDate,
  endDate,
}: Params): Promise<{ success: boolean; data?: EvolucionVentasData; error?: string }> {
  try {
    const actual = rangoReporte(startDate, endDate);
    const prev = rangoAnterior(startDate, endDate);
    const previo = rangoReporte(prev.start, prev.end);
    const [vAct, vPrev] = await Promise.all([cargar(actual.startDate, actual.endDate), cargar(previo.startDate, previo.endDate)]);

    const dias = diasEnRango(startDate, endDate);
    const dia = new Map<string, { ventas: number; numero: number; ventasAnterior: number }>();

    for (let i = 0; i < dias; i++) dia.set(addDays(startDate, i), { ventas: 0, numero: 0, ventasAnterior: 0 });

    const hora = new Map<number, { ventas: number; numero: number }>();

    for (const v of vAct) {
      if (!v.fechaVenta) continue;
      const d = dia.get(diaBD(v.fechaVenta));
      const h = hora.get(v.fechaVenta.getUTCHours()) ?? { ventas: 0, numero: 0 };

      if (d) {
        d.ventas += Number(v.total);
        d.numero += 1;
      }
      h.ventas += Number(v.total);
      h.numero += 1;
      hora.set(v.fechaVenta.getUTCHours(), h);
    }

    // Día equivalente del período anterior: mismo número de día dentro del rango
    for (const v of vPrev) {
      if (!v.fechaVenta) continue;
      const desfase = diasEnRango(prev.start, diaBD(v.fechaVenta)) - 1;
      const d = dia.get(addDays(startDate, desfase));

      if (d) d.ventasAnterior += Number(v.total);
    }

    const porDia = Array.from(dia.entries()).map(([fecha, v]) => ({ fecha, ...v }));

    // Promedio por día de la semana (contando también los días sin ventas)
    const semana = NOMBRES_DIA.map((nombre) => ({ dia: nombre, total: 0, ocurrencias: 0 }));

    for (const p of porDia) {
      const dow = (new Date(`${p.fecha}T00:00:00Z`).getUTCDay() + 6) % 7; // lunes = 0

      semana[dow].total += p.ventas;
      semana[dow].ocurrencias += 1;
    }

    const conVentas = porDia.filter((p) => p.ventas > 0);
    const ordenados = [...conVentas].sort((a, b) => b.ventas - a.ventas);
    const mitad = Math.floor(porDia.length / 2);
    const primera = porDia.slice(0, mitad).reduce((s, p) => s + p.ventas, 0);
    const segunda = porDia.slice(porDia.length - mitad).reduce((s, p) => s + p.ventas, 0);

    return {
      success: true,
      data: {
        rango: { start: startDate, end: endDate, dias },
        actual: totales(vAct),
        anterior: totales(vPrev),
        porDia,
        porDiaSemana: semana.map((s) => ({
          ...s,
          promedio: s.ocurrencias ? s.total / s.ocurrencias : 0,
        })),
        porHora: Array.from(hora.entries())
          .map(([h, v]) => ({ hora: h, ...v }))
          .sort((a, b) => a.hora - b.hora),
        mejorDia: ordenados[0] ? { fecha: ordenados[0].fecha, ventas: ordenados[0].ventas } : null,
        peorDia: conVentas.length > 1 ? { fecha: ordenados[ordenados.length - 1].fecha, ventas: ordenados[ordenados.length - 1].ventas } : null,
        diasSinVentas: porDia.length - conVentas.length,
        tendencia: mitad >= 3 && primera > 0 ? ((segunda - primera) / primera) * 100 : null,
      },
    };
  } catch (error) {
    console.error("Error en getSalesEvolution:", error);

    return { success: false, error: "Error al calcular la evolución de ventas" };
  }
}
