export type Severidad = "danger" | "warning" | "success";

/** Días que faltan para la fecha (negativo si ya venció). null si no hay fecha. */
export function getDiasParaVencer(fecha: string | null | undefined): number | null {
  if (!fecha) return null;
  const hoy = new Date();

  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fecha);

  venc.setHours(0, 0, 0, 0);

  return Math.round((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
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
