import { hoyBolivia } from "@/src/utils/date";
import { addDays } from "@/src/utils/report-dates";

/**
 * Períodos y formato de fechas de las pantallas de historial.
 *
 * Las fechas de la BD son "hora de pared" de Bolivia guardada en campos UTC (ver src/utils/date.ts),
 * así que el día y la hora que se muestran se leen en UTC, NO en la zona horaria del navegador.
 */
export type Period = "todo" | "hoy" | "7d" | "30d" | "mes";

export const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: "todo", label: "Todo el historial" },
  { key: "hoy", label: "Hoy" },
  { key: "7d", label: "Últimos 7 días" },
  { key: "30d", label: "Últimos 30 días" },
  { key: "mes", label: "Este mes" },
];

/** YYYY-MM-DD del día calendario de una fecha (ISO) guardada en la BD */
const diaDe = (fechaISO: string) => fechaISO.slice(0, 10);

/** true si la fecha (ISO) cae dentro del período elegido */
export function inPeriod(fechaISO: string, period: Period): boolean {
  if (period === "todo") return true;

  const dia = diaDe(fechaISO);
  const hoy = hoyBolivia();

  if (period === "hoy") return dia >= hoy;
  if (period === "7d") return dia >= addDays(hoy, -6);
  if (period === "30d") return dia >= addDays(hoy, -29);

  return dia >= `${hoy.slice(0, 8)}01`;
}

export function formatDay(fechaISO: string): string {
  const dia = diaDe(fechaISO);
  const hoy = hoyBolivia();

  if (dia === hoy) return "Hoy";
  if (dia === addDays(hoy, -1)) return "Ayer";

  return new Date(fechaISO).toLocaleDateString("es-BO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatTime(fechaISO: string): string {
  return new Date(fechaISO).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

export function formatShortDate(fechaISO: string): string {
  return new Date(fechaISO).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Rango personalizado: from/to en formato YYYY-MM-DD (vacío = sin límite) */
export function inDateRange(fechaISO: string, from: string, to: string): boolean {
  const dia = diaDe(fechaISO);

  if (from && dia < from) return false;
  if (to && dia > to) return false;

  return true;
}
