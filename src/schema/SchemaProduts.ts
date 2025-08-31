import { z } from 'zod'

export const categorySchema = z.object({
    id: z.number(),
    nombre: z.string().nonempty("El nombre de la categoría es requerido"),
    cantidadProductos: z.number(),
    fechaRegistro: z.date(),
    usuarioIdRegistro: z.number(),
    fechaActualizacion: z.date(),
    usuarioIdActualizacion: z.number()
})

export const categoryList = z.array(
    categorySchema.pick({
        id: true,
        nombre: true,
        cantidadProductos: true
    })
)

// Corregido: no debe ser array para crear una categoría
export const categoryCreate = categorySchema.pick({
    nombre: true,
    fechaRegistro: true,
    usuarioIdRegistro: true
})

export const categoryUpdate = categorySchema.pick({
    id: true,
    nombre: true,
    fechaActualizacion: true,
    usuarioIdActualizacion: true
})


export const categoryDelete = categorySchema.pick({
    id: true,
    nombre: true,

})

export type Category = z.infer<typeof categorySchema>
export type CategoryList = z.infer<typeof categoryList>
export type CategoryCreate = z.infer<typeof categoryCreate>
export type CategoryUpdate = z.infer<typeof categoryUpdate>
export type CategoryDelete = z.infer<typeof categoryDelete>

//seccion 2

// Schema para Unidad de Medida
export const unidadMedidaSchema = z.object({
    id: z.number(),
    nombre: z.string().min(1, "El nombre es requerido"),
    abreviatura: z.string().min(1, "La abreviatura es requerida").max(10, "Máximo 10 caracteres")
})

export const unidadMedidaCreateSchema = unidadMedidaSchema.pick({
    nombre: true,
    abreviatura: true
})

export const unidadMedidaListSchema = z.array(
    unidadMedidaSchema.pick({
        id: true,
        nombre: true,
        abreviatura: true
    })
)

// Schema para Conversión de Unidades
export const conversionUnidadSchema = z.object({
    id: z.number().optional(),
    productoID: z.number().optional(),
    unidadOrigenID: z.number().min(1, "Debe seleccionar una unidad origen"),
    unidadDestinoID: z.number().min(1, "Debe seleccionar una unidad destino"),
    factorConversion: z.number().min(0.01, "El factor debe ser mayor a 0"),
    precioVentaUnitario: z.number().min(0, "El precio debe ser mayor o igual a 0").optional(),
    estado: z.number().default(1)
})

// Schema principal del Producto
export const productoSchema = z.object({
    id: z.number().optional(),
    nombre: z.string().min(1, "El nombre del producto es requerido"),
    descripcion: z.string().optional().nullable(),
    categoriaID: z.number().min(1, "Debe seleccionar una categoría"),
    proveedorID: z.number().min(1, "Debe seleccionar un proveedor"),
    unidadBaseID: z.number().min(1, "Debe seleccionar una unidad base"),
    requiereNumeroSerie: z.boolean().default(false),
    estado: z.number().default(1),
    fechaRegistro: z.date().optional(),
    usuarioRegistro: z.number(),
    fechaActualizacion: z.date().optional(),
    usuarioActualizacion: z.number().optional()
})

// Schema para crear producto
export const productoCreateSchema = productoSchema.pick({
    nombre: true,
    descripcion: true,
    categoriaID: true,
    proveedorID: true,
    unidadBaseID: true,
    requiereNumeroSerie: true,
    usuarioRegistro: true
})

// Schema para conversiones en el formulario
export const conversionFormSchema = z.object({
    unidadOrigenID: z.string().min(1, "Debe seleccionar una unidad").transform(val => parseInt(val)),
    unidadDestinoID: z.string().min(1, "Debe seleccionar una unidad").transform(val => parseInt(val)),
    factorConversion: z.number().min(0.01, "El factor debe ser mayor a 0"),
    precioVentaUnitario: z.number().min(0, "El precio debe ser mayor o igual a 0"),
    estado: z.number()
})

// Schema para el formulario completo de producto (MEJORADO)
export const productoCompleteFormSchema = z.object({
    nombre: z.string().min(1, "El nombre del producto es requerido"),
    descripcion: z.string().optional(),
    categoriaID: z.string().min(1, "Debe seleccionar una categoría"),
    proveedorID: z.string().min(1, "Debe seleccionar un proveedor"),
    requiereNumeroSerie: z.boolean().default(false).optional(),
    conversiones: z.array(z.object({
        unidadOrigenID: z.string().min(1, "Debe seleccionar una unidad"),
        factorConversion: z.number().min(0.01, "El factor debe ser mayor a 0"),
        precioVentaUnitario: z.number().min(0, "El precio debe ser mayor o igual a 0"),
        esUnidadBase: z.boolean().default(false).optional()
    })).min(1, "Debe tener al menos una unidad de venta")
        .refine((conversiones) => {
            // Validar que la primera conversión sea la unidad base
            return conversiones.length > 0 && conversiones[0].factorConversion === 1;
        }, "La primera unidad debe ser la unidad base con factor 1")
})

// Schema para nueva unidad modal
export const nuevaUnidadFormSchema = z.object({
    nombre: z.string().min(1, "El nombre es requerido"),
    abreviatura: z.string().min(1, "La abreviatura es requerida").max(10, "Máximo 10 caracteres")
})

// Types
export type UnidadMedida = z.infer<typeof unidadMedidaSchema>
export type UnidadMedidaCreate = z.infer<typeof unidadMedidaCreateSchema>
export type UnidadMedidaList = z.infer<typeof unidadMedidaListSchema>
export type ConversionUnidad = z.infer<typeof conversionUnidadSchema>
export type ConversionForm = z.infer<typeof conversionFormSchema>
export type Producto = z.infer<typeof productoSchema>
export type ProductoCreate = z.infer<typeof productoCreateSchema>
export type ProductoCompleteForm = z.infer<typeof productoCompleteFormSchema>
export type NuevaUnidadForm = z.infer<typeof nuevaUnidadFormSchema>

// Tipo para los datos que se enviarán a la API
export type ProductoApiData = {
    producto: {
        nombre: string;
        descripcion?: string;
        categoriaID: number;
        proveedorID: number;
        unidadBaseID: number;
        requiereNumeroSerie: boolean;
        usuarioRegistro: number;
    };
    conversiones: {
        unidadOrigenID: number;
        unidadDestinoID: number;
        factorConversion: number;
        precioVentaUnitario: number;
        estado: number;
    }[];
    nuevasUnidades?: {
        nombre: string;
        abreviatura: string;
    }[];
}

