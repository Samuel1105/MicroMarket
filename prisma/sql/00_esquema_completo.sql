BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[Categoria] (
    [id] TINYINT NOT NULL IDENTITY(1,1),
    [nombre] NVARCHAR(50) NOT NULL,
    [estado] TINYINT CONSTRAINT [DF__Categoria__estad__534D60F1] DEFAULT 1,
    [fechaRegistro] DATETIME CONSTRAINT [DF__Categoria__fecha__5441852A] DEFAULT CURRENT_TIMESTAMP,
    [usuarioIdRegistro] TINYINT,
    [fechaActualizacion] DATETIME,
    [usuarioIdActualizacion] TINYINT,
    CONSTRAINT [PK__Categori__3213E83F5A652AA7] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Cliente] (
    [id] INT NOT NULL IDENTITY(1,1),
    [carnet] NVARCHAR(20) NOT NULL,
    [nombre] NVARCHAR(100) NOT NULL,
    [correo] NVARCHAR(100) NOT NULL,
    [estado] TINYINT CONSTRAINT [DF_Cliente_estado] DEFAULT 1,
    [fechaRegistro] DATETIME CONSTRAINT [DF__Cliente__fechaRe__74AE54BC] DEFAULT CURRENT_TIMESTAMP,
    [usuarioIdRegistro] TINYINT,
    [fechaActualizacion] DATETIME,
    [usuarioIdActualizacion] TINYINT,
    CONSTRAINT [PK__Cliente__3213E83F993E9587] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[CodigoBarrasItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [stockVentaID] INT NOT NULL,
    [codigoBarras] NVARCHAR(50) NOT NULL,
    [estado] TINYINT CONSTRAINT [DF__CodigoBar__estad__571DF1D5] DEFAULT 1,
    [fechaRegistro] DATETIME CONSTRAINT [DF__CodigoBar__fecha__5812160E] DEFAULT CURRENT_TIMESTAMP,
    [usuarioRegistro] TINYINT NOT NULL,
    CONSTRAINT [PK__CodigoBa__3213E83FBAB3ED0D] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UQ__CodigoBa__42674CE227562430] UNIQUE NONCLUSTERED ([codigoBarras])
);

-- CreateTable
CREATE TABLE [dbo].[Compra] (
    [id] INT NOT NULL IDENTITY(1,1),
    [numeroCompra] NVARCHAR(50),
    [proveedorID] SMALLINT NOT NULL,
    [subtotal] DECIMAL(12,2) NOT NULL,
    [descuento] DECIMAL(12,2) CONSTRAINT [DF__Compra__descuent__59063A47] DEFAULT 0,
    [total] DECIMAL(12,2) NOT NULL,
    [estado] TINYINT CONSTRAINT [DF__Compra__estado__59FA5E80] DEFAULT 1,
    [usuarioIdRegistro] TINYINT NOT NULL,
    [fechaRegistro] DATETIME CONSTRAINT [DF__Compra__fechaReg__5AEE82B9] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__Compra__3213E83F88F59E10] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ConversionUnidad] (
    [id] INT NOT NULL IDENTITY(1,1),
    [productoID] SMALLINT NOT NULL,
    [unidadOrigenID] TINYINT NOT NULL,
    [unidadDestinoID] TINYINT NOT NULL,
    [factorConversion] DECIMAL(8,2) NOT NULL,
    [precioVentaUnitario] DECIMAL(10,2),
    [estado] TINYINT CONSTRAINT [DF__Conversio__estad__5BE2A6F2] DEFAULT 1,
    CONSTRAINT [PK__Conversi__3213E83FC4CC5D76] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[DetalleCompra] (
    [id] INT NOT NULL IDENTITY(1,1),
    [compraID] INT NOT NULL,
    [productoID] SMALLINT NOT NULL,
    [unidadMedidaID] TINYINT NOT NULL,
    [cantidadComprada] DECIMAL(8,2) NOT NULL,
    [precioUnitario] DECIMAL(10,2) NOT NULL,
    [subtotal] DECIMAL(12,2) NOT NULL,
    [descuento] DECIMAL(12,2) CONSTRAINT [DF__DetalleCo__descu__5CD6CB2B] DEFAULT 0,
    [total] DECIMAL(12,2) NOT NULL,
    [estado] TINYINT CONSTRAINT [DF__DetalleCo__estad__5DCAEF64] DEFAULT 1,
    CONSTRAINT [PK__DetalleC__3213E83FBEE708AB] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[DetalleVenta] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ventaID] INT NOT NULL,
    [stockVentaID] INT NOT NULL,
    [codigoBarrasItemID] INT,
    [cantidadVendida] DECIMAL(8,2) NOT NULL,
    [cantidadUnidadesBase] DECIMAL(8,2) NOT NULL,
    [precioUnitario] DECIMAL(10,2) NOT NULL,
    [subtotal] DECIMAL(12,2) NOT NULL,
    [descuento] DECIMAL(12,2) CONSTRAINT [DF__DetalleVe__descu__5EBF139D] DEFAULT 0,
    [total] DECIMAL(12,2) NOT NULL,
    CONSTRAINT [PK__DetalleV__3213E83F834BAD11] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Lote] (
    [id] INT NOT NULL IDENTITY(1,1),
    [numeroLote] NVARCHAR(50) NOT NULL,
    [productoID] SMALLINT NOT NULL,
    [detalleCompraID] INT NOT NULL,
    [fechaVencimiento] DATETIME,
    [cantidadInicialUnidadesBase] DECIMAL(8,2) NOT NULL,
    [estado] TINYINT CONSTRAINT [DF__Lote__estado__5FB337D6] DEFAULT 1,
    [fechaRegistro] DATETIME CONSTRAINT [DF__Lote__fechaRegis__60A75C0F] DEFAULT CURRENT_TIMESTAMP,
    [usuarioIdRegistro] TINYINT NOT NULL,
    CONSTRAINT [PK__Lote__3213E83FDDEDA848] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MovimientoAlmacen] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tipoMovimiento] TINYINT NOT NULL,
    [productoID] SMALLINT NOT NULL,
    [loteID] INT,
    [unidadMedidaID] TINYINT NOT NULL,
    [cantidad] DECIMAL(8,2) NOT NULL,
    [cantidadUnidadesBase] DECIMAL(8,2) NOT NULL,
    [referenciaID] INT,
    [tipoReferencia] TINYINT,
    [observaciones] NVARCHAR(200),
    [fechaRegistro] DATETIME CONSTRAINT [DF__Movimient__fecha__619B8048] DEFAULT CURRENT_TIMESTAMP,
    [usuarioIdRegistro] TINYINT NOT NULL,
    CONSTRAINT [PK__Movimien__3213E83F0D66D5A7] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Persona] (
    [id] TINYINT NOT NULL IDENTITY(1,1),
    [primerNombre] NVARCHAR(50) NOT NULL,
    [segundoNombre] NVARCHAR(50),
    [apellidoPaterno] NVARCHAR(50) NOT NULL,
    [apellidoMaterno] NVARCHAR(50) NOT NULL,
    [correo] NVARCHAR(100) NOT NULL,
    [celular] INT NOT NULL,
    [contraseña] NVARCHAR(255) NOT NULL,
    [rol] TINYINT NOT NULL,
    [estado] TINYINT CONSTRAINT [DF__Usuario__estado__05D8E0BE] DEFAULT 1,
    [fechaRegistro] DATETIME CONSTRAINT [DF__Usuario__fechaRe__06CD04F7] DEFAULT CURRENT_TIMESTAMP,
    [usuarioIdRegistro] TINYINT,
    [fechaActualizacion] DATETIME,
    [usuarioIdActualizacion] TINYINT,
    CONSTRAINT [PK__Usuario__3213E83F868220B9] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Producto] (
    [id] SMALLINT NOT NULL IDENTITY(1,1),
    [nombre] NVARCHAR(100) NOT NULL,
    [descripcion] NVARCHAR(200),
    [categoriaID] TINYINT NOT NULL,
    [proveedorID] SMALLINT NOT NULL,
    [unidadBaseID] TINYINT NOT NULL,
    [stockMinimo] DECIMAL(8,2) NOT NULL CONSTRAINT [DF_Producto_stockMinimo] DEFAULT 10,
    [estado] TINYINT CONSTRAINT [DF__Producto__estado__6477ECF3] DEFAULT 1,
    [fechaRegistro] DATETIME CONSTRAINT [DF__Producto__fechaR__656C112C] DEFAULT CURRENT_TIMESTAMP,
    [usuarioRegistro] TINYINT NOT NULL,
    [fechaActualizacion] DATETIME,
    [usuarioActualizacion] TINYINT,
    CONSTRAINT [PK__Producto__3213E83FEC4BF38E] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Proveedor] (
    [id] SMALLINT NOT NULL IDENTITY(1,1),
    [nombre] NVARCHAR(100) NOT NULL,
    [celular] INT,
    [correo] NVARCHAR(100),
    [direccion] NVARCHAR(200),
    [estado] TINYINT CONSTRAINT [DF__Proveedor__estad__3B75D760] DEFAULT 1,
    [fechaRegistro] DATETIME CONSTRAINT [DF__Proveedor__fecha__3C69FB99] DEFAULT CURRENT_TIMESTAMP,
    [usuarioIdRegistro] TINYINT,
    [fechaActualizacion] DATETIME,
    [usuarioIdActualizacion] TINYINT,
    CONSTRAINT [PK__Proveedo__3213E83F7A55648D] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[StockVenta] (
    [id] INT NOT NULL IDENTITY(1,1),
    [productoID] SMALLINT NOT NULL,
    [loteID] INT,
    [unidadMedidaID] TINYINT NOT NULL,
    [cantidadDisponible] DECIMAL(8,2) NOT NULL,
    [cantidadUnidadesBase] DECIMAL(8,2) NOT NULL,
    [precioVenta] DECIMAL(10,2) NOT NULL,
    [fechaVencimiento] DATETIME,
    [estado] TINYINT CONSTRAINT [DF__StockVent__estad__68487DD7] DEFAULT 1,
    [fechaRegistro] DATETIME CONSTRAINT [DF__StockVent__fecha__693CA210] DEFAULT CURRENT_TIMESTAMP,
    [usuarioRegistro] TINYINT NOT NULL,
    CONSTRAINT [PK__StockVen__3213E83F6E4BB41D] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[UnidadMedida] (
    [id] TINYINT NOT NULL IDENTITY(1,1),
    [nombre] NVARCHAR(50) NOT NULL,
    [abreviatura] NVARCHAR(10),
    [estado] TINYINT CONSTRAINT [DF__UnidadMed__estad__6A30C649] DEFAULT 1,
    CONSTRAINT [PK__UnidadMe__3213E83FEAB66E46] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Venta] (
    [id] INT NOT NULL IDENTITY(1,1),
    [numeroVenta] NVARCHAR(50),
    [clienteID] INT NOT NULL,
    [subtotal] DECIMAL(12,2) NOT NULL,
    [descuento] DECIMAL(12,2) CONSTRAINT [DF__Venta__descuento__6B24EA82] DEFAULT 0,
    [impuestos] DECIMAL(12,2) CONSTRAINT [DF__Venta__impuestos__6C190EBB] DEFAULT 0,
    [total] DECIMAL(12,2) NOT NULL,
    [montoRecibido] DECIMAL(12,2) NOT NULL,
    [cambio] DECIMAL(12,2) NOT NULL,
    [metodoPago] TINYINT CONSTRAINT [DF__Venta__metodoPag__6D0D32F4] DEFAULT 1,
    [estado] TINYINT CONSTRAINT [DF__Venta__estado__6E01572D] DEFAULT 1,
    [fechaVenta] DATETIME CONSTRAINT [DF__Venta__fechaVent__6EF57B66] DEFAULT CURRENT_TIMESTAMP,
    [usuarioRegistro] TINYINT NOT NULL,
    CONSTRAINT [PK__Venta__3213E83F09C74565] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Notificacion] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tipo] NVARCHAR(30) NOT NULL,
    [rolDestino] TINYINT NOT NULL,
    [productoID] SMALLINT NOT NULL,
    [titulo] NVARCHAR(120) NOT NULL,
    [mensaje] NVARCHAR(300) NOT NULL,
    [enlace] NVARCHAR(120),
    [estado] TINYINT NOT NULL CONSTRAINT [DF_Notificacion_estado] DEFAULT 0,
    [fechaRegistro] DATETIME NOT NULL,
    [fechaCierre] DATETIME,
    [usuarioIdCierre] TINYINT,
    [usuarioIdRegistro] TINYINT,
    CONSTRAINT [PK_Notificacion] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SolicitudCompra] (
    [id] INT NOT NULL IDENTITY(1,1),
    [numero] NVARCHAR(30) NOT NULL,
    [proveedorID] SMALLINT NOT NULL,
    [estado] TINYINT NOT NULL CONSTRAINT [DF_SolicitudCompra_estado] DEFAULT 0,
    [fechaRegistro] DATETIME NOT NULL,
    [usuarioIdRegistro] TINYINT NOT NULL,
    [compraID] INT,
    [fechaCierre] DATETIME,
    CONSTRAINT [PK_SolicitudCompra] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SolicitudCompraDetalle] (
    [id] INT NOT NULL IDENTITY(1,1),
    [solicitudID] INT NOT NULL,
    [productoID] SMALLINT NOT NULL,
    CONSTRAINT [PK_SolicitudCompraDetalle] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Anulacion] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tipo] TINYINT NOT NULL,
    [referenciaID] INT NOT NULL,
    [motivo] NVARCHAR(200) NOT NULL,
    [usuarioID] TINYINT NOT NULL,
    [fecha] DATETIME NOT NULL,
    CONSTRAINT [PK_Anulacion] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_Notificacion_rol_estado] ON [dbo].[Notificacion]([rolDestino], [estado]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_Anulacion_tipo_ref] ON [dbo].[Anulacion]([tipo], [referenciaID]);

-- AddForeignKey
ALTER TABLE [dbo].[CodigoBarrasItem] ADD CONSTRAINT [FK__CodigoBar__stock__71D1E811] FOREIGN KEY ([stockVentaID]) REFERENCES [dbo].[StockVenta]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Compra] ADD CONSTRAINT [FK__Compra__proveedo__534D60F1] FOREIGN KEY ([proveedorID]) REFERENCES [dbo].[Proveedor]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ConversionUnidad] ADD CONSTRAINT [FK__Conversio__produ__4AB81AF0] FOREIGN KEY ([productoID]) REFERENCES [dbo].[Producto]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ConversionUnidad] ADD CONSTRAINT [FK__Conversio__unida__4BAC3F29] FOREIGN KEY ([unidadOrigenID]) REFERENCES [dbo].[UnidadMedida]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ConversionUnidad] ADD CONSTRAINT [FK__Conversio__unida__4CA06362] FOREIGN KEY ([unidadDestinoID]) REFERENCES [dbo].[UnidadMedida]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DetalleCompra] ADD CONSTRAINT [FK__DetalleCo__compr__5812160E] FOREIGN KEY ([compraID]) REFERENCES [dbo].[Compra]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DetalleCompra] ADD CONSTRAINT [FK__DetalleCo__produ__59063A47] FOREIGN KEY ([productoID]) REFERENCES [dbo].[Producto]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DetalleCompra] ADD CONSTRAINT [FK__DetalleCo__unida__59FA5E80] FOREIGN KEY ([unidadMedidaID]) REFERENCES [dbo].[UnidadMedida]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DetalleVenta] ADD CONSTRAINT [FK__DetalleVe__codig__02084FDA] FOREIGN KEY ([codigoBarrasItemID]) REFERENCES [dbo].[CodigoBarrasItem]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DetalleVenta] ADD CONSTRAINT [FK__DetalleVe__stock__01142BA1] FOREIGN KEY ([stockVentaID]) REFERENCES [dbo].[StockVenta]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DetalleVenta] ADD CONSTRAINT [FK__DetalleVe__venta__00200768] FOREIGN KEY ([ventaID]) REFERENCES [dbo].[Venta]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Lote] ADD CONSTRAINT [FK__Lote__detalleCom__5FB337D6] FOREIGN KEY ([detalleCompraID]) REFERENCES [dbo].[DetalleCompra]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Lote] ADD CONSTRAINT [FK__Lote__productoID__5EBF139D] FOREIGN KEY ([productoID]) REFERENCES [dbo].[Producto]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MovimientoAlmacen] ADD CONSTRAINT [FK__Movimient__loteI__6477ECF3] FOREIGN KEY ([loteID]) REFERENCES [dbo].[Lote]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MovimientoAlmacen] ADD CONSTRAINT [FK__Movimient__produ__6383C8BA] FOREIGN KEY ([productoID]) REFERENCES [dbo].[Producto]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MovimientoAlmacen] ADD CONSTRAINT [FK__Movimient__unida__656C112C] FOREIGN KEY ([unidadMedidaID]) REFERENCES [dbo].[UnidadMedida]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Producto] ADD CONSTRAINT [FK__Producto__catego__44FF419A] FOREIGN KEY ([categoriaID]) REFERENCES [dbo].[Categoria]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Producto] ADD CONSTRAINT [FK__Producto__provee__45F365D3] FOREIGN KEY ([proveedorID]) REFERENCES [dbo].[Proveedor]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Producto] ADD CONSTRAINT [FK__Producto__unidad__46E78A0C] FOREIGN KEY ([unidadBaseID]) REFERENCES [dbo].[UnidadMedida]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockVenta] ADD CONSTRAINT [FK__StockVent__loteI__6B24EA82] FOREIGN KEY ([loteID]) REFERENCES [dbo].[Lote]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockVenta] ADD CONSTRAINT [FK__StockVent__produ__6A30C649] FOREIGN KEY ([productoID]) REFERENCES [dbo].[Producto]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockVenta] ADD CONSTRAINT [FK__StockVent__unida__6C190EBB] FOREIGN KEY ([unidadMedidaID]) REFERENCES [dbo].[UnidadMedida]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Venta] ADD CONSTRAINT [FK__Venta__clienteID__7C4F7684] FOREIGN KEY ([clienteID]) REFERENCES [dbo].[Cliente]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SolicitudCompra] ADD CONSTRAINT [FK_SolicitudCompra_Proveedor] FOREIGN KEY ([proveedorID]) REFERENCES [dbo].[Proveedor]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SolicitudCompraDetalle] ADD CONSTRAINT [FK_SolicitudDetalle_Solicitud] FOREIGN KEY ([solicitudID]) REFERENCES [dbo].[SolicitudCompra]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SolicitudCompraDetalle] ADD CONSTRAINT [FK_SolicitudDetalle_Producto] FOREIGN KEY ([productoID]) REFERENCES [dbo].[Producto]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

