import { addDays, diasEnRango } from "@/src/utils/report-dates";

/** Las fechas de la base están en hora de Bolivia guardada como UTC: se leen siempre con getUTC* / timeZone UTC */
export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const DIAS_SEMANA_LARGO = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export const fechaEs = (iso: string) => iso.split("-").reverse().join("/");
export const fechaCorta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-BO", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

/** Segundos (como vienen del servidor) → ISO */
export const isoDeSegundos = (s: number) => new Date(s * 1000).toISOString();
/** Día calendario YYYY-MM-DD de unos segundos */
export const diaDeSegundos = (s: number) => new Date(s * 1000).toISOString().slice(0, 10);
/** 0 = lunes … 6 = domingo */
export const diaSemanaDe = (s: number) => (new Date(s * 1000).getUTCDay() + 6) % 7;
export const horaDe = (s: number) => new Date(s * 1000).getUTCHours();

/**
 * Agrupa los días de un rango en "cubos" para los gráficos del tiempo:
 * un cubo por día si el rango es corto, y por semana (lunes a domingo) si es largo (más de 62 días).
 */
export function crearCubos(start: string, end: string) {
  const dias = diasEnRango(start, end);
  const porSemana = dias > 62;
  const lunesDe = (dia: string) => addDays(dia, -((new Date(`${dia}T00:00:00Z`).getUTCDay() + 6) % 7));
  const claveDe = (dia: string) => (porSemana ? lunesDe(dia) : dia);
  const claves: string[] = [];

  for (let i = 0; i < dias; i++) {
    const k = claveDe(addDays(start, i));

    if (!claves.includes(k)) claves.push(k);
  }

  return {
    dias,
    porSemana,
    claves,
    etiquetas: claves.map((k) => (porSemana ? `Sem. ${fechaCorta(k)}` : fechaCorta(k))),
    /** Cubo al que pertenece un día YYYY-MM-DD */
    de: claveDe,
    /** Índice del cubo de un día, o -1 si cae fuera */
    indice: (dia: string) => claves.indexOf(claveDe(dia)),
  };
}
