import {z} from 'zod'

// Schema base para contactos
export const contactSchema = z.object({
    id: z.number(),
    carnet: z.string().min(7, "Ingrese un carnet valido").nonempty("El carnet es requerido"),
    nombre: z.string(),
    celular: z
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
        .email("Formato de correo inválido")
        .toLowerCase(),
    usuarioIdRegistro: z.number(),
    fechaActualizacion: z.date(),
    usuarioIdActualizacion: z.number()
})

// Extensión del schema base para proveedores con campos opcionales
export const supplierContactSchema = contactSchema.extend({
    // Nombre es requerido (no puede ser vacío, null o undefined)
    nombre: z.string().min(1, "El nombre es requerido"),
    
    // Celular opcional - si se ingresa debe ser válido
    celular: z.number()
        .int()
        .optional()
        .nullable()
        .refine(val => {
            if (!val) return true; // Si es null, undefined, está bien
            const str = val.toString();
            return str.length === 8 && /^[67]/.test(str);
        }, {
            message: "El número debe tener 8 dígitos y comenzar con 6 o 7"
        }),
    
    // Dirección opcional
    direccion: z.string()
        .optional()
        .nullable()
        .transform(val => val === "" ? null : val),
    
    // Correo opcional - si se ingresa debe ser válido
    correo: z.string()
        .optional()
        .nullable()
        .transform(val => val === "" ? null : val)
        .refine(val => !val || z.string().email().safeParse(val).success, {
            message: "Formato de correo inválido"
        })
})

/** Cliente - correo requerido */
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
    id: true,
    carnet: true,
    nombre: true,
    correo: true,
    usuarioIdActualizacion: true,
    fechaActualizacion: true
})

export const CustomerSchema = contactSchema.pick({
    id: true,
    carnet: true,
    nombre: true,
    correo: true,
})

/** Proveedor - correo opcional */
export const SupplierListSchema = z.array(
    supplierContactSchema.pick({
        id: true,
        nombre: true,
        celular: true,
        correo: true,
        direccion: true,
    })
)

export const SupplierCreateSchema = supplierContactSchema.pick({
    nombre: true,
    celular: true,
    correo: true,
    direccion: true,
    usuarioIdRegistro: true
})

export const SupplierUpdateSchema = supplierContactSchema.pick({
    id: true,
    nombre: true,
    celular: true,
    correo: true,
    direccion: true,
    usuarioIdActualizacion: true,
    fechaActualizacion: true
})

export const SupplierSchema = supplierContactSchema.pick({
    id: true,
    nombre: true,
    celular: true,
    correo: true,
    direccion: true,
})

// Types
export type CustomerList = z.infer<typeof CustomerListSchema>
export type CustomerCreate = z.infer<typeof CustomerCreateSchema>
export type CustomerUpdate = z.infer<typeof CustomerUpdateSchema>
export type CustomerDelete = z.infer<typeof CustomerSchema>

export type SupplierList = z.infer<typeof SupplierListSchema>
export type SupplierCreate = z.infer<typeof SupplierCreateSchema>
export type SupplierUpdate = z.infer<typeof SupplierUpdateSchema>
export type Supplier = z.infer<typeof SupplierSchema>