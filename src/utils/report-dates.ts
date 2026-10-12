import { hoyBolivia } from "@/src/utils/date";

/**
 * Fechas de los reportes.
 *
 * En la base de datos las fechas se guardan como "hora de pared" de Bolivia dentro de
 * los campos UTC (ver getBoliviaTime), así que el día calendario de un registro es el
 * que se obtiene con toISOString()/getUTC*(). Por eso el rango se arma también en UTC:
 *
 *   desde  = inicio del día "start"  (00:00:00.000)
 *   hasta  = fin del día "end"       (23:59:59.999)   → ambos días INCLUIDOS (>= y <=)
 */

export type ReportRange = { startDate: Date; endDate: Date };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** YYYY-MM-DD de una fecha local */
export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Rango por defecto de los reportes: del día 1 del mes actual hasta hoy (hoy = hoy en Bolivia) */
export function getCurrentMonthRange(): { start: string; end: string } {
  const hoy = hoyBolivia();

  return { start: `${hoy.slice(0, 8)}01`, end: hoy };
}

/** Convierte "YYYY-MM-DD" (inicio/fin) en límites inclusivos para consultas. */
export function rangoReporte(start?: string, end?: string): ReportRange {
  const def = getCurrentMonthRange();
  const s = (start || def.start).slice(0, 10);
  const e = (end || def.end).slice(0, 10);

  return {
    startDate: new Date(`${s}T00:00:00.000Z`),
    endDate: new Date(`${e}T23:59:59.999Z`),
  };
}

/** YYYY-MM-DD del día calendario de una fecha guardada en la BD */
export function diaBD(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ───────────── Utilidades de rango (puras: sirven en cliente y en servidor) ─────────────

function parts(s: string): [number, number, number] {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);

  return [y, m, d];
}

export function addDays(s: string, n: number): string {
  const [y, m, d] = parts(s);

  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Cantidad de días del rango, contando ambos extremos */
export function diasEnRango(start: string, end: string): number {
  const [y1, m1, d1] = parts(start);
  const [y2, m2, d2] = parts(end);

  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1;
}

/** Período inmediatamente anterior, con la misma cantidad de días */
export function rangoAnterior(start: string, end: string): { start: string; end: string } {
  const dias = diasEnRango(start, end);
  const prevEnd = addDays(start, -1);

  return { start: addDays(prevEnd, -(dias - 1)), end: prevEnd };
}

export type PresetKey = "mes" | "mes_pasado" | "7d" | "30d" | "anio";

export const REPORT_PRESETS: { key: PresetKey; label: string }[] = [
  { key: "mes", label: "Este mes" },
  { key: "mes_pasado", label: "Mes pasado" },
  { key: "7d", label: "Últimos 7 días" },
  { key: "30d", label: "Últimos 30 días" },
  { key: "anio", label: "Este año" },
];

export function presetRange(key: PresetKey): { start: string; end: string } {
  const hoyStr = hoyBolivia();
  const [y, m] = parts(hoyStr);

  if (key === "mes") return getCurrentMonthRange();
  if (key === "mes_pasado") {
    const ini = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
    const fin = new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10);

    return { start: ini, end: fin };
  }
  if (key === "7d") return { start: addDays(hoyStr, -6), end: hoyStr };
  if (key === "30d") return { start: addDays(hoyStr, -29), end: hoyStr };

  return { start: `${y}-01-01`, end: hoyStr };
}

/** "01/09/2026 – 18/09/2026" */
export function formatRangoEs(start: string, end: string): string {
  const f = (s: string) => {
    const [y, m, d] = parts(s);

    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  };

  return `${f(start)} – ${f(end)}`;
}
