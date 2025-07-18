import Heading from "@/components/ui/Heading";
import EditUserForm from "@/components/users/EditUserForm";
import UserForm from "@/components/users/UserForm";
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

export default async function EditUserPage({ params }: { params: { id: string } }) {

    const usuario = await getUserById(+params.id)
    
    return (
        <>
            <Heading >Editando a {usuario.primerNombre}</Heading>
            <div className="container mx-auto px-4  max-w-6xl">

                <div className="w-full pt-5">
                    <EditUserForm>
                        <UserForm 
                            usuario = {usuario}
                        />
                    </EditUserForm>
                </div>
            </div>
        </>
    )
}
