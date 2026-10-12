/**
 * Fechas del sistema.
 *
 * Convención ÚNICA: en la base de datos las fechas se guardan como "hora de pared" de Bolivia
 * dentro de los campos UTC (si en Bolivia son las 21:00, se guarda 21:00Z). Así el día calendario
 * de un registro siempre es el que sale de toISOString()/getUTC*(), sin importar en qué zona horaria
 * corra el servidor (tu PC, Vercel/UTC) ni el navegador.
 *
 * Bolivia es UTC-4 todo el año (no tiene horario de verano).
 */
const BOLIVIA_OFFSET_MS = 4 * 60 * 60 * 1000;

/** Ahora, como "hora de pared" de Bolivia en los campos UTC. Es lo que se guarda en la BD. */
export function getBoliviaTime(): Date {
  return new Date(Date.now() - BOLIVIA_OFFSET_MS);
}

/** Hoy en Bolivia, como YYYY-MM-DD */
export function hoyBolivia(): string {
  return getBoliviaTime().toISOString().slice(0, 10);
}

/** Primer instante del mes de `d` (más/menos `meses`), en la misma convención. */
export function inicioMesBolivia(d: Date = getBoliviaTime(), meses = 0): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + meses, 1));
}

/** Último instante del mes de `d` (más/menos `meses`), en la misma convención. */
export function finMesBolivia(d: Date = getBoliviaTime(), meses = 0): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + meses + 1, 0, 23, 59, 59, 999));
}

/** "dd/MM" del día calendario de una fecha guardada en la BD */
export function fechaCorta(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");

  return `${dd}/${mm}`;
}
