"use server";

import { prisma } from "@/src/lib/prisma";
import { userFormSchema } from "@/src/schema";
import { hashPassword } from "@/src/utils/auth";

export async function createUserAction(data: unknown) {
    try {
        const result = userFormSchema.safeParse(data);
        
        if (!result.success) {
            return {
                errors: result.error.issues
            };
        }

        // Verificar si el usuario ya existe
        const existingUser = await prisma.persona.findFirst({
            where: {
                correo: result.data.correo,
                estado: 1
            }
        });

        if (existingUser) {
            return {
                error: "Ya existe un usuario con este correo electrónico"
            };
        }

        // Hashear la contraseña
        const hashedPassword = await hashPassword(result.data.contraseña);

        // Crear el nuevo usuario
        await prisma.persona.create({
            data: {
                primerNombre: result.data.primerNombre,
                segundoNombre: result.data.segundoNombre,
                apellidoPaterno: result.data.apellidoPaterno,
                apellidoMaterno: result.data.apellidoMaterno,
                correo: result.data.correo,
                contrase_a: hashedPassword, // Guardar la contraseña hasheada
                celular: result.data.celular,
                rol: result.data.rol,
                estado: 1, // Usuario activo
                fechaRegistro: new Date(),
                usuarioIdRegistro: 1 // ID del usuario que crea este registro (ajustar según tu lógica)
            }
        });

        return {
            success: true,
            message: 'Usuario Creado Exitosamente'
        };

    } catch (error) {
        console.error("Error al crear usuario:", error);
        return {
            error: error instanceof Error ? error.message : "Error desconocido al crear usuario"
        };
    }
}