"use server";

import { prisma } from "@/src/lib/prisma";
import { userListSchema } from "@/src/schema";

export async function ListUser() {
    try {
        const usuarios = await prisma.persona.findMany({
            where: { estado: 1 },
            select: {
                id: true,
                primerNombre: true,
                segundoNombre: true,
                apellidoPaterno: true,
                apellidoMaterno: true,
                correo: true,
                celular: true,
                rol: true
            }
        });
        const response = userListSchema.safeParse(usuarios);
        //console.log(response);
        if (response.success) {
            return {
                data: response.data
            };
        }
        else{
            return {
                error: response.error.message
            };
        }

    } catch (error) {
        
        return {
            error: error instanceof Error ? error.message : "Error desconocido"
        };
    }
}