/** Formato de dinero: Bs. 1,234.50 */
export function bs(n: number, decimals = 2): string {
  return `Bs. ${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function num(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function pct(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

/** Variación porcentual contra el período anterior. null si no hay base para comparar. */
export function variacion(actual: number, anterior: number): number | null {
  if (!anterior) return null;

  return ((actual - anterior) / Math.abs(anterior)) * 100;
}
