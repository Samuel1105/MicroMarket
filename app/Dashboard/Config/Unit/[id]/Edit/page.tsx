import { ProtectedRoute } from '@/components/ProtectedRoute';
import Heading from '@/components/ui/Heading';
import EditUnitForm from '@/components/unit/EditUnitForm';
import UnitForm from '@/components/unit/UnitForm';
import { prisma } from '@/src/lib/prisma';
import { notFound } from 'next/navigation';
import React from 'react'

async function getUnitById(id: number) {
    const client = await prisma.unidadMedida.findUnique({
        where: {
            id,
        },
    });

    if (!client) {
        notFound();
    }

    return client;
}


export default async function page({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const unit = await getUnitById(+id);
    return (
        <ProtectedRoute allowedRoles={[1, 2]}>
            <Heading>Editando a {unit.nombre}</Heading>
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="w-full pt-5">
                    <EditUnitForm>
                        <UnitForm unit={unit} />
                    </EditUnitForm>
                </div>
            </div>
        </ProtectedRoute>
    )
}
