import {z} from 'zod'

export const contactSchema = z.object({
    id: z.number(),
    carnet: z.string().min(7, "Ingrese un carnet valido").nonempty("El carnet es requerido"),
    nombre: z.string(),
    celular:z
        .number()
        .int()
        .refine((num) => {
            const str = num.toString();
            return str.length === 8 && /^[67]/.test(str);
        }, {
            message: "El número debe tener 8 dígitos y comenzar con 6 o 7",
        }),
    direccion: z.string(),
    correo: z.string()
        .min(1, "El correo es requerido")
        .email("Formato de correo inválido").toLowerCase(),
    usuarioIdRegistro: z.number(),
    fechaActualizacion: z.date(),
    usuarioIdActualizacion: z.number()
    
})

/** CLiente */

export const CustomerListSchema = z.array(
    contactSchema.pick({
        id: true,
        carnet: true,
        nombre: true,
        correo: true,
    })
)

export const CustomerCreateSchema = contactSchema.pick({
    carnet: true,
    nombre: true,
    correo: true,
    usuarioIdRegistro: true
})

export const CustomerUpdateSchema = contactSchema.pick({
    id:true,
    carnet: true,
    nombre: true,
    correo: true,
    usuarioIdActualizacion: true,
    fechaActualizacion: true
})

export const CustomerSchema = 
    contactSchema.pick({
        id: true,
        carnet: true,
        nombre: true,
        correo: true,
    }
)

/* Supplier ------- */

export const SupplierListSchema = z.array(
    contactSchema.pick({
        nombre: true,
        celular: true,
        correo: true,
        direccion: true,
    })
) 

export type CustomerList = z.infer<typeof CustomerListSchema>
export type CustomerCreate = z.infer<typeof CustomerCreateSchema>
export type CustomerUpdate = z.infer<typeof CustomerUpdateSchema>
export type CustomerDelete = z.infer<typeof CustomerSchema>

export type SupplierList = z.infer<typeof SupplierListSchema>