/**
 * Carnet de identidad (CI) boliviano: de 5 a 9 dígitos y, si tiene, un complemento o extensión
 * de hasta 3 letras/dígitos (ej. "1234567", "1234567 CB", "1234567-1A").
 * El "0" está reservado para el cliente general (ventas rápidas sin datos).
 */
const CARNET_RE = /^\d{5,9}(?:[ -]?[0-9A-Z]{1,3})?$/;

export const MENSAJE_CARNET = "Carnet no válido: escribe de 5 a 9 dígitos y, si tiene, el complemento (ej. 1234567 CB).";

/** Quita espacios de más y pasa a mayúsculas, para comparar siempre igual */
export const normalizarCarnet = (s: string | null | undefined) => (s ?? "").trim().toUpperCase().replace(/\s+/g, " ");

export const carnetValido = (s: string | null | undefined) => CARNET_RE.test(normalizarCarnet(s));
