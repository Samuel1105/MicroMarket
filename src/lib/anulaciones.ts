/**
 * Anulación de ventas y de compras.
 *
 *  - Una venta anulada pasa a estado 2: deja de contar en reportes, y el producto vuelve al estante
 *    (y el código de barras vuelve a estar disponible).
 *  - Una compra anulada pasa a estado 2 junto con sus lotes: deja de contar en reportes y de estar en el
 *    almacén. Solo se puede anular si NO se sacó nada de esos lotes al estante ni se ajustaron.
 *  - Cada anulación queda registrada en la tabla Anulacion (motivo, usuario, fecha).
 *
 * Este archivo no usa nada del servidor: se puede importar también desde las pantallas.
 */
export const ANULACION_VENTA = 1;
export const ANULACION_COMPRA = 2;

export const ESTADO_ACTIVO = 1;
export const ESTADO_ANULADO = 2;

/** Movimiento de almacén de un ingreso cuya compra se anuló (queda en el historial, pero ya no suma) */
export const MOV_INGRESO_ANULADO = 5;

export const MOTIVOS_ANULACION_VENTA = ["Error al cobrar", "Producto equivocado", "El cliente canceló la compra", "Otro"] as const;
export const MOTIVOS_ANULACION_COMPRA = ["Compra registrada por error", "Datos mal cargados", "El proveedor no entregó", "Otro"] as const;

/** Roles que pueden anular: ventas → Administrador y Cajero (este solo la suya y del mismo día); compras → Administrador y Compras */
export const ROLES_ANULAR_COMPRA = [1, 5];

export function puedeAnularVenta(rol: number | null | undefined, opts: { esSuya: boolean; esDeHoy: boolean }): boolean {
  if (rol === 1) return true;
  if (rol === 2) return opts.esSuya && opts.esDeHoy;

  return false;
}

export const puedeAnularCompra = (rol: number | null | undefined) => !!rol && ROLES_ANULAR_COMPRA.includes(rol);
