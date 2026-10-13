/**
 * Movimientos de almacén y cómo afectan lo que queda de un lote.
 *
 *  1 = Ingreso por compra
 *  2 = Salida del almacén al estante
 *  3 = Ajuste de almacén   (cantidad CON SIGNO: − baja, + alta)
 *  4 = Ajuste de estante   (cantidad CON SIGNO: − baja, + alta)
 *
 * Lo que queda en el almacén de un lote = inicial − salidas al estante + ajustes de almacén.
 * Lo que debería haber en el estante      = salidas al estante − vendido + ajustes de estante.
 *
 * Este archivo no usa nada del servidor: se puede importar también desde pantallas.
 */
export const MOV_INGRESO = 1;
export const MOV_SALIDA_ESTANTE = 2;
export const MOV_AJUSTE_ALMACEN = 3;
export const MOV_AJUSTE_ESTANTE = 4;

/** Valor de `tipoReferencia` de un movimiento que viene de un ajuste */
export const REF_AJUSTE = 3;

/** Movimientos que hay que traer junto a un lote para saber cuánto queda en almacén y estante */
export const MOV_DEL_LOTE = { tipoMovimiento: { in: [MOV_SALIDA_ESTANTE, MOV_AJUSTE_ALMACEN, MOV_AJUSTE_ESTANTE] } };

export const MOTIVOS_AJUSTE = [
  "Merma/daño",
  "Vencido (baja)",
  "Pérdida/robo",
  "Error de conteo",
  "Corrección de registro",
  "Otro",
] as const;

export type MotivoAjuste = (typeof MOTIVOS_AJUSTE)[number];

type Mov = { tipoMovimiento: number; cantidadUnidadesBase: unknown };

export function resumenMovimientosLote(movs: ReadonlyArray<Mov>) {
  let salidas = 0;
  let ajusteAlmacen = 0;
  let ajusteEstante = 0;

  for (const m of movs) {
    const v = Number(m.cantidadUnidadesBase ?? 0);

    if (m.tipoMovimiento === MOV_SALIDA_ESTANTE) salidas += v;
    else if (m.tipoMovimiento === MOV_AJUSTE_ALMACEN) ajusteAlmacen += v;
    else if (m.tipoMovimiento === MOV_AJUSTE_ESTANTE) ajusteEstante += v;
  }

  return { salidas, ajusteAlmacen, ajusteEstante };
}

/** Unidades base que quedan en el almacén de un lote (sin límite inferior: quien lo usa decide) */
export function enAlmacenDelLote(inicial: unknown, movs: ReadonlyArray<Mov>): number {
  const r = resumenMovimientosLote(movs);

  return Number(inicial ?? 0) - r.salidas + r.ajusteAlmacen;
}
