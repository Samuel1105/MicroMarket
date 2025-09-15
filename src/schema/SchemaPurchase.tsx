import { z } from "zod"

export const schemaDetailPurchase = z.array(
    z.object({
        id: z.number(),
        compraId: z.number(),
        unidadMedidaId: z.number(),
        cantidadComprada: z.number(),
        precioUnitario: z.number().finite(),
        subtotal: z.number(),
        descuento: z.number().optional(),
        total: z.number()
    })

)

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
    })
)

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
    })
)

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
    movimientos: schemaMove
})

export type Purchase = z.infer<typeof schemaPurchase>
export type DetailPurchase = z.infer<typeof schemaDetailPurchase>
export type Lote = z.infer<typeof schemaLote>
export type Move = z.infer<typeof schemaMove>
