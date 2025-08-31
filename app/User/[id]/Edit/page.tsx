import { ProtectedRoute } from "@/components/ProtectedRoute";
import Heading from "@/components/ui/Heading";
import EditUserForm from "@/components/user/EditUserForm";
import UserForm from "@/components/user/UserForm";
import { prisma } from "@/src/lib/prisma";
import { notFound } from "next/navigation";

async function getUserById(id: number) {
    const product = await prisma.persona.findUnique({
        where: {
            id
        }
    })
    if (!product) {
        notFound()
    }
    return product
}

// Corregido: params ahora es una Promise en Next.js 15
export default async function EditUserPage({ 
    params 
}: { 
    params: Promise<{ id: string }> 
}) {
    const { id } = await params;
    const usuario = await getUserById(+id)
   
    return (
        <ProtectedRoute allowedRoles={[1]}>
            <Heading>Editando a {usuario.primerNombre}</Heading>
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="w-full pt-5">
                    <EditUserForm>
                        <UserForm
                            usuario={usuario}
                        />
                    </EditUserForm>
                </div>
            </div>
        </ProtectedRoute>
    )
}