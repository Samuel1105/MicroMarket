/**
 * Colores por entidad (persona, categoría, producto…). Paleta categórica validada (orden fijo);
 * el color sigue a la entidad —se asigna por orden alfabético de TODA la lista— y no cambia cuando un filtro
 * quita o agrega elementos. Pasadas 8 entidades, el resto va en gris ("Otros").
 */
export const PALETA = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
export const COLOR_OTROS = "#a5adba";

export function mapaColores(nombres: string[]): (n: string) => string {
  const orden = Array.from(new Set(nombres)).sort((a, b) => a.localeCompare(b));
  const mapa = new Map(orden.map((n, i) => [n, i < PALETA.length ? PALETA[i] : COLOR_OTROS]));

  return (n) => mapa.get(n) ?? COLOR_OTROS;
}
