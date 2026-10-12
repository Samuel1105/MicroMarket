import { hoyBolivia } from "@/src/utils/date";

export type Severidad = "danger" | "warning" | "success";

/** Días que faltan para la fecha (negativo si ya venció). null si no hay fecha. */
export function getDiasParaVencer(fecha: string | null | undefined): number | null {
  if (!fecha) return null;

  // Se comparan días calendario (YYYY-MM-DD) contra "hoy" de Bolivia: sin depender de la zona horaria
  // del navegador. Un producto que vence hoy tiene 0 días (todavía se puede vender).
  const aMs = (s: string) => {
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);

    return Date.UTC(y, m - 1, d);
  };

  return Math.round((aMs(fecha) - aMs(hoyBolivia())) / (1000 * 60 * 60 * 24));
}

export function getSeveridad(dias: number | null): Severidad | null {
  if (dias === null) return null;
  if (dias <= 7) return "danger";
  if (dias <= 14) return "warning";

  return "success";
}

export function formatVencimiento(dias: number | null): string {
  if (dias === null) return "";
  if (dias < 0) return `Venció hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}`;
  if (dias === 0) return "Vence hoy";

  return `Vence en ${dias} día${dias === 1 ? "" : "s"}`;
}
