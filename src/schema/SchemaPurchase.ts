import { z } from "zod";

export const schemaDetailPurchase = z.array(
  z.object({
    id: z.number(),
    compraId: z.number(),
    unidadMedidaId: z.number(),
    cantidadComprada: z.number(),
    precioUnitario: z.number().finite(),
    subtotal: z.number(),
    descuento: z.number().optional(),
    total: z.number(),
  }),
);

export const schemaLote = z.array(
  z.object({
    id: z.number(),
    numeroLote: z.string(),
    productoId: z.number(),
    detalleCompraId: z.number(),
    fechaVencimiento: z.date().optional(),
    cantidadInicialUnidadBase: z.number(),
    usuarioIdRegistro: z.number(),
    fechaRegistro: z.date(),
  }),
);

export const schemaMove = z.array(
  z.object({
    id: z.number(),
    tipoMovimineto: z.number(), // 1: ingreso, 2: egreso
    productoId: z.number(),
    loteId: z.number(),
    unidadMedidadId: z.number(),
    cantidad: z.number(),
    cantidadUnidadesBase: z.number(),
    fechaRegistro: z.date(),
    usuarioIdRegistro: z.number(),
  }),
);

export const schemaPurchase = z.object({
  id: z.number(),
  numeroCompra: z.string(),
  proveedorId: z.number(),
  subtotal: z.number(),
  descuento: z.number().optional(),
  total: z.number(),
  usuarioIdRegistro: z.number(),
  fechaRegistro: z.date(),
  detalles: schemaDetailPurchase,
  lote: schemaLote,
  movimientos: schemaMove,
});

export type Purchase = z.infer<typeof schemaPurchase>;
export type DetailPurchase = z.infer<typeof schemaDetailPurchase>;
export type Lote = z.infer<typeof schemaLote>;
export type Move = z.infer<typeof schemaMove>;

// Schema para unidad de producto
export const unidadProductoSchema = z.object({
  id: z.number(), // ID de la conversión
  unidadId: z.number(), // ID de la unidad de medida
  nombre: z.string(), // Nombre de la unidad (ej: "Unidad", "Caja")
  abreviatura: z.string().nullable(), // Abreviatura (ej: "UN", "CAJ")
  factor: z.number(), // Factor de conversión (1 para base, 12 para caja)
  precio: z.number(), // Precio de venta en esta unidad
  esUnidadBase: z.boolean(), // Si es la unidad base del producto
});

// Schema para producto con sus unidades
export const productoConUnidadesSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  unidades: z.array(unidadProductoSchema), // Array de unidades disponibles
});

// Schema para la lista de productos
export const productosListSchema = z.array(productoConUnidadesSchema);

// Types exportados
export type UnidadProducto = z.infer<typeof unidadProductoSchema>;
export type ProductoConUnidades = z.infer<typeof productoConUnidadesSchema>;
export type ProductosListSchema = z.infer<typeof productosListSchema>;

// Tipos actualizados para el sistema de compras
export interface PurchaseDetailItem {
  id: string; // ID temporal para el frontend
  productoId: number;
  productoNombre: string;
  unidadMedidaId: number;
  unidadNombre: string;
  unidadAbreviatura: string; // Cambiado para manejar null como string vacío
  factorConversion: number;
  cantidadComprada: number;
  precioUnitario: number;
  subtotal: number;
  descuento: number;
  total: number;
  numeroLote: string;
  fechaVencimiento?: Date;
}

export interface PurchaseData {
  proveedorId: number;
  subtotal: number;
  descuento: number;
  total: number;
  detalles: PurchaseDetailItem[];
}

// Tipos para enviar al backend
export interface CreatePurchaseRequest {
  numeroCompra: string;
  proveedorID: number;
  subtotal: number;
  descuento?: number;
  total: number;
  usuarioIdRegistro: number;
  detalles: CreateDetailPurchaseRequest[];
}

export interface CreateDetailPurchaseRequest {
  productoID: number;
  unidadMedidaID: number;
  cantidadComprada: number;
  precioUnitario: number;
  subtotal: number;
  descuento?: number;
  total: number;
  lote: CreateLoteRequest;
}

export interface CreateLoteRequest {
  numeroLote: string;
  productoID: number;
  fechaVencimiento?: Date;
  cantidadInicialUnidadesBase: number;
  usuarioIdRegistro: number;
}

export interface CreateMovimientoAlmacenRequest {
  tipoMovimiento: number; // 1 = ingreso
  productoID: number;
  loteID: number;
  unidadMedidaID: number;
  cantidad: number;
  cantidadUnidadesBase: number;
  referenciaID: number; // ID de la compra
  tipoReferencia: number; // 1 = compra
  usuarioIdRegistro: number;
}