import EditSupplierForm from '@/components/contact/EditSupplierForm'
import SupplierForm from '@/components/contact/SupplierForm'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Heading from '@/components/ui/Heading'
import { prisma } from '@/src/lib/prisma'
import { notFound } from 'next/navigation'
import React from 'react'

async function getSupplierById(id: number) {
    const proveedor = await prisma.proveedor.findUnique({
        where: {
            id
        }
    })

    if (!proveedor) {
        notFound()
    }

    return proveedor
}

export default async function EditSupplierPage({ params }: { params: { id: string } }) {
    const proveedor = await getSupplierById(+params.id)
    return (
        <ProtectedRoute allowedRoles={[1, 3, 4]}>
            <Heading >Editando a {proveedor.nombre}</Heading>
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="w-full pt-5">
                    <EditSupplierForm>
                        <SupplierForm proveedor={proveedor} />
                    </EditSupplierForm>
                </div>
            </div>

        </ProtectedRoute>
    )
}
