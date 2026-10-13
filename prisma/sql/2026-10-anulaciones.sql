-- Anulación de ventas y compras: tabla de registro (quién, cuándo y por qué).
-- Es una tabla NUEVA: no modifica ninguna tabla existente. Ejecútala UNA vez en cada base de datos
-- (tu base local y la de Somee) antes de usar las nuevas pantallas de anulación.
-- Alternativa: `npx prisma db push` con la DATABASE_URL de esa base.

IF OBJECT_ID('dbo.Anulacion', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Anulacion (
    id           INT IDENTITY(1,1) NOT NULL,
    tipo         TINYINT NOT NULL,          -- 1 = venta, 2 = compra
    referenciaID INT NOT NULL,              -- id de la venta o de la compra
    motivo       NVARCHAR(200) NOT NULL,
    usuarioID    TINYINT NOT NULL,
    fecha        DATETIME NOT NULL,
    CONSTRAINT PK_Anulacion PRIMARY KEY (id)
  );
  CREATE INDEX IX_Anulacion_tipo_ref ON dbo.Anulacion (tipo, referenciaID);
END
GO
