/**
 * Reglas de la caja. Las usan la pantalla de venta (para avisar) y el servidor (para hacerlas cumplir).
 *
 * Solo el Administrador puede cambiar el precio de venta de un producto o dar descuentos grandes.
 * Los demás roles venden al precio del estante y pueden dar un descuento de hasta el 10 % por línea.
 */
export const ROL_ADMIN_VENTAS = 1;
export const MAX_DESCUENTO_SIN_ADMIN = 0.1;

export const puedeCambiarPrecio = (rol: number | undefined | null) => rol === ROL_ADMIN_VENTAS;
