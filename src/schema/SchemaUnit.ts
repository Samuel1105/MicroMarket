import { z } from 'zod'

export const SchemaUnit = z.object({
    id: z.number(),
    nombre: z.string(),
    abreviatura: z.string()
})

export const SchemaUpdateUnit = SchemaUnit.pick({
    id: true,
    nombre: true,
    abreviatura: true
})


export type UnitUpdate = z.infer<typeof SchemaUpdateUnit>
