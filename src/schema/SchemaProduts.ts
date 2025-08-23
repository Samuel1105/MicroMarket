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