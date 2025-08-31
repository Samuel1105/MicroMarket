"use server"

import { prisma } from "@/src/lib/prisma";
import { userLoginSchema } from "@/src/schema";
import { checkPassword } from "@/src/utils/auth";

export async function handleLoginAction(formData: FormData) {
    const email = formData.get("email")?.toString() ?? "";
    const password = formData.get("password")?.toString() ?? "";

    // Validación con Zod
    const result = userLoginSchema.safeParse({ correo: email, contraseña: password });
    
    if (!result.success) {
        return { success: false, errors: result.error.issues };
    }

    try {
        // Buscar usuario en la base de datos
        const persona = await prisma.persona.findFirst({
            select: {
                id: true,
                primerNombre: true,
                segundoNombre: true,
                apellidoPaterno: true,
                apellidoMaterno: true,
                celular: true,
                correo: true,
                contrase_a: true,
                rol: true,
                estado: true
            },
            where: {
                correo: email,
                estado: 1,
            }
        });

        if (!persona) {
            return {
                success: false,
                error: "Credenciales incorrectas"
            };
        }

        // Verificar contraseña
        const passwordMatch = await checkPassword(password, persona.contrase_a);
        
        if (!passwordMatch) {
            return {
                success: false,
                error: "Credenciales incorrectas"
            };
        }

        // Excluir contraseña y convertir null a undefined para compatibilidad con tipos
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { contrase_a, ...rawUserData } = persona;
        
        const userData = {
            ...rawUserData,
            segundoNombre: rawUserData.segundoNombre ?? undefined,
            estado: rawUserData.estado ?? 1
        };

        return {
            success: true,
            redirectTo: "/Dashboard",
            data: {
                message: "Login exitoso",
                data: userData
            }
        };

    } catch (error) {
        console.error("Error en login:", error);
        
        // Manejo específico de errores de Prisma
        if (error instanceof Error) {
            return {
                success: false,
                error: process.env.NODE_ENV === 'development' 
                    ? `Error de base de datos: ${error.message}` 
                    : "Error interno del servidor"
            };
        }

        return {
            success: false,
            error: "Error inesperado durante el login"
        };
    }
}