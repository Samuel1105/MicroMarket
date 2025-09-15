"use server"
import { prisma } from "@/src/lib/prisma"
import { SupplierListSchema } from "@/src/schema/SchemaContact"

export async function ListSuppliers() {
    try {
        const suppliers = await prisma.proveedor.findMany({
            where: {estado: 1},
            select: {
                id:true,
                nombre: true,
                celular: true,
                correo: true,
                direccion: true,
            }
        })
        const response = SupplierListSchema.safeParse(suppliers)
        if(response.success){
            return{ 
                data: response.data
            }
        }else{
            return {
                error: response.error.message
            }
        }
    } catch (error) {
        return{
            error: error instanceof Error ? error.message : "Error desconocido"
        }
    }
}