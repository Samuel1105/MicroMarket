-- Micro Mercado Anita · todo el cobro es en EFECTIVO (el documento no contempla tarjeta ni transferencia).
-- Ejecutar en la base de Somee (o en cualquier base que ya tenga ventas de prueba con otros métodos de pago).
-- 1 = efectivo. Es seguro correrlo más de una vez.
UPDATE dbo.Venta SET metodoPago = 1 WHERE metodoPago IS NULL OR metodoPago <> 1;
SELECT metodoPago, COUNT(*) AS ventas FROM dbo.Venta GROUP BY metodoPago;  -- debe quedar una sola fila: 1
