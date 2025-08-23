"use server"
import { prisma } from "@/src/lib/prisma";
import { SupplierCreate } from "@/src/schema/SchemaContact";
import { getBoliviaTime } from "@/src/utils/date";

export async function createSupplierAction(data:SupplierCreate) {
    try {
        const existSupplier = await prisma.proveedor.findFirst({
            where: {
                celular: data.celular,
                estado: 1
            }
        })

        if(existSupplier){
            return {
                error: "Ya existe un proveedor con este numero de celular"
            }
        }

        await prisma.proveedor.create({
            data: {
                nombre: data.nombre,
                celular: data.celular,
                correo: data.correo,
                direccion: data.direccion,
                fechaRegistro: getBoliviaTime(),
                usuarioIdRegistro: data.usuarioIdRegistro
            }
        })

        return {
            success: true,
            message: "Proveedor registrado existosamente"
        }

    } catch (error) {
        console.error("Error al crear un cliente:", error);
        return {
            error: error instanceof Error ? error.message : "Error desconocido al crear cliente"
        };
    }
}