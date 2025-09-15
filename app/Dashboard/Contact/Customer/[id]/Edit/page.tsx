import CustomerForm from "@/components/contact/CustomerForm"
import EditCustomerForm from "@/components/contact/EditCustomerForm"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import Heading from "@/components/ui/Heading"
import { prisma } from "@/src/lib/prisma"
import { notFound } from "next/navigation"

async function getClientById(id: number) {
    const client = await prisma.cliente.findUnique({
        where: {
            id
        }
    })
    if (!client) {
        notFound()
    }
    return client
}

// En Next.js 15, params es una Promise
export default async function EditCustomerPage({ 
    params 
}: { 
    params: Promise<{ id: string }> 
}) {
    // Await the params Promise
    const { id } = await params; 
    const client = await getClientById(+id)
    
    return (
        <ProtectedRoute allowedRoles={[1, 3, 4]}>
            <Heading>Editando a {client.nombre}</Heading>
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="w-full pt-5">
                    <EditCustomerForm>
                        <CustomerForm cliente={client} />
                    </EditCustomerForm>
                </div>
            </div>
        </ProtectedRoute>
    )
}