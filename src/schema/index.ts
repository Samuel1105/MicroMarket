import { z } from 'zod'

export const userSchema = z.object({
    id: z.number(),
    primerNombre: z.string(),
    segundoNombre: z.string(),
    apellidoPaterno: z.string(),
    apellidoMaterno: z.string(),
    celular: z.number(),
    rol: z.number(),
    correo: z
        .string()
        .min(1, "El correo es requerido")
        .email("Formato de correo inválido")
        .toLowerCase(),
    contraseña: z
        .string()
        .min(6, "La contraseña debe tener al menos 6 caracteres")
        .max(100, "La contraseña no puede exceder 100 caracteres")
})

export const userLoginSchema = userSchema.pick({
    correo: true,
    contraseña: true
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
        rol: true
    })
)

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
export type UserForm = z.infer<typeof userFormSchema>;





