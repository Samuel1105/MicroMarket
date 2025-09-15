"use server";

import { prisma } from "@/src/lib/prisma";
import { UserUpdateData, userUpdateSchema } from "@/src/schema";
import { hashPassword } from "@/src/utils/auth";
import { getBoliviaTime } from "@/src/utils/date";

export async function updateUserAction(data: unknown) {
    try {
        const result = userUpdateSchema.safeParse(data);

        if (!result.success) {
            return {
                errors: result.error.issues
            };
        }

        const currentUser = await prisma.persona.findFirst({
            where: {
                id: result.data.id,
                estado: 1
            }
        });

        if (!currentUser) {
            return {
                error: "Usuario no encontrado"
            };
        }

        const existingUser = await prisma.persona.findFirst({
            where: {
                correo: result.data.correo,
                estado: 1,
                id: {
                    not: result.data.id
                }
            }
        });

        if (existingUser) {
            return {
                error: "Ya existe otro usuario con este correo electrónico"
            };
        }



        const updateData: UserUpdateData = {
            primerNombre: result.data.primerNombre,
            segundoNombre: result.data.segundoNombre,
            apellidoPaterno: result.data.apellidoPaterno,
            apellidoMaterno: result.data.apellidoMaterno,
            correo: result.data.correo,
            celular: result.data.celular,
            rol: result.data.rol,
            fechaActualizacion: result.data.fechaActualizacion,
            usuarioIdActualizacion: result.data.usuarioIdActualizacion
        };

        if (result.data.contrase_a && result.data.contrase_a.trim() !== '') {
            const hashedPassword = await hashPassword(result.data.contrase_a);
            updateData.contrase_a = hashedPassword;
        }

        await prisma.persona.update({
            where: {
                id: result.data.id
            },
            data: updateData
        });

        return {
            success: true,
            message: 'Usuario actualizado exitosamente'
        };

    } catch (error) {
        console.error("Error al actualizar usuario:", error);
        return {
            error: error instanceof Error ? error.message : "Error desconocido al actualizar usuario"
        };
    }
}

export async function deleteUserAction(id: number , userId: number) {
    try {

        const response = await prisma.persona.update({
            where: {
                id: id
            },
            data: {
                estado: 0,
                fechaActualizacion: getBoliviaTime(),
                usuarioIdActualizacion: userId
            }
        })

        if (response) {
            return {
                success: true,
                message: 'Usuario Eliminado exitosamente'
            };
        }


    } catch (error) {
        console.error("Error al eliminar el usuario:", error);
        return {
            error: error instanceof Error ? error.message : "Error desconocido al eliminar el usuario"
        };
    }
}