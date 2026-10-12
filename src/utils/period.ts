export type Period = "todo" | "hoy" | "7d" | "30d" | "mes";

export const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: "todo", label: "Todo el historial" },
  { key: "hoy", label: "Hoy" },
  { key: "7d", label: "Últimos 7 días" },
  { key: "30d", label: "Últimos 30 días" },
  { key: "mes", label: "Este mes" },
];

/** true si la fecha (ISO) cae dentro del período elegido */
export function inPeriod(fechaISO: string, period: Period): boolean {
  if (period === "todo") return true;

  const fecha = new Date(fechaISO);
  const ahora = new Date();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

  if (period === "hoy") return fecha >= inicioHoy;
  if (period === "7d") return fecha >= new Date(inicioHoy.getTime() - 6 * 86400000);
  if (period === "30d") return fecha >= new Date(inicioHoy.getTime() - 29 * 86400000);

  return fecha >= new Date(ahora.getFullYear(), ahora.getMonth(), 1);
}

export function formatDay(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  const ahora = new Date();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const inicioFecha = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const diff = Math.round((inicioHoy.getTime() - inicioFecha.getTime()) / 86400000);

  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";

  return fecha.toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function formatTime(fechaISO: string): string {
  return new Date(fechaISO).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
}

export function formatShortDate(fechaISO: string): string {
  return new Date(fechaISO).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

/** Rango personalizado: from/to en formato YYYY-MM-DD (vacío = sin límite) */
export function inDateRange(fechaISO: string, from: string, to: string): boolean {
  const d = new Date(fechaISO);
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const toTime = (s: string) => {
    const [y, m, dd] = s.split("-").map(Number);

    return new Date(y, m - 1, dd).getTime();
  };

  if (from && day < toTime(from)) return false;
  if (to && day > toTime(to)) return false;

  return true;
}
