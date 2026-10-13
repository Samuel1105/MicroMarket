/**
 * Compra en dos pasos (como en Odoo):
 *
 *  1. CONFIRMAR la compra (Compras/Administrador): se genera el número y se registran la Compra y su detalle.
 *     La compra queda "Por recibir" (estado 3) y sus lotes también (estado 3): todavía NO hay stock.
 *  2. VALIDAR LA RECEPCIÓN (Gestor de Almacén/Administrador): se verifica lo que llegó físicamente contra lo
 *     pedido (nunca más de lo pedido), se completa lote y vencimiento, y recién ahí se crea el lote (estado 1)
 *     y el movimiento de ingreso (tipo 1). La compra pasa a "Recibida" (estado 1).
 *
 * Estados de la compra: 1 = recibida/vigente · 2 = anulada · 3 = por recibir.
 *
 * Este archivo no usa nada del servidor: se puede importar también desde las pantallas.
 */
export const ESTADO_COMPRA_RECIBIDA = 1;
export const ESTADO_COMPRA_ANULADA = 2;
export const ESTADO_COMPRA_POR_RECIBIR = 3;

/** Quién puede validar la recepción en el almacén */
export const ROLES_VALIDAR_RECEPCION = [1, 3];
/** Quién puede ver la lista de compras por recibir (Compras solo mira) */
export const ROLES_VER_RECEPCIONES = [1, 3, 5];

export const puedeValidarRecepcion = (rol: number | null | undefined) => !!rol && ROLES_VALIDAR_RECEPCION.includes(rol);
