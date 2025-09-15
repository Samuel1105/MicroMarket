import { z } from 'zod'

export const userSchema = z.object({
    id: z.number(),
    primerNombre: z.string().min(1, "El primer nombre es requerido"),
    segundoNombre: z.string().nullable().optional(),
    apellidoPaterno: z.string().min(1, "El apellido paterno es requerido"),
    apellidoMaterno: z.string().min(1, "El apellido materno es requerido"),
    celular: z
        .number()
        .int()
        .refine((num) => {
            const str = num.toString();
            return str.length === 8 && /^[67]/.test(str);
        }, {
            message: "El número debe tener 8 dígitos y comenzar con 6 o 7",
        }),
    rol: z.number().min(1, "El rol es requerido"),
    correo: z
        .string()
        .min(1, "El correo es requerido")
        .email("Formato de correo inválido")
        .toLowerCase(),
    contraseña: z
        .string()
        .min(6, "La contraseña debe tener al menos 6 caracteres")
        .max(100, "La contraseña no puede exceder 100 caracteres"),
    usuarioIdRegistro: z.number(),
    fechaActualizacion: z.date(),
    usuarioIdActualizacion: z.number()
})

export const userLoginSchema = userSchema.pick({
    correo: true,
    contraseña: true
})

export const userDeleteSchema = userSchema.pick({
    id: true,
    primerNombre: true,
    segundoNombre: true,
    apellidoPaterno: true,
    apellidoMaterno: true,
    correo: true,
    celular: true,
    rol: true,

})

export const userListSchema = z.array(
    userSchema.pick({
        id: true,
        primerNombre: true,
        segundoNombre: true,
        apellidoPaterno: true,
        apellidoMaterno: true,
        correo: true,
        celular: true,
        rol: true,

    })
)

// Schema para crear usuarios (contraseña obligatoria)
export const userCreateSchema = userSchema.pick({
    primerNombre: true,
    segundoNombre: true,
    apellidoPaterno: true,
    apellidoMaterno: true,
    correo: true,
    contraseña: true,
    celular: true,
    rol: true,
    usuarioIdRegistro: true
})

// Schema para editar usuarios (contraseña opcional)
export const userUpdateSchema = userSchema.pick({
    primerNombre: true,
    segundoNombre: true,
    apellidoPaterno: true,
    apellidoMaterno: true,
    correo: true,
    celular: true,
    rol: true,
    fechaActualizacion: true,
    usuarioIdActualizacion: true
}).extend({
    id: z.number(),
    contrase_a: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional()
})

// Mantenemos el schema original para compatibilidad
export const userFormSchema = userSchema.pick({
    primerNombre: true,
    segundoNombre: true,
    apellidoPaterno: true,
    apellidoMaterno: true,
    correo: true,
    contraseña: true,
    celular: true,
    rol: true
})

export type UserList = z.infer<typeof userListSchema>;
export type UserListSingular = z.infer<typeof userDeleteSchema>;
export type UserForm = z.infer<typeof userFormSchema>;
export type UserCreate = z.infer<typeof userCreateSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type UserUpdateData = Omit<UserUpdate, 'id'>;