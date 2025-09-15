import CategoryForm from "@/components/product/CategoryForm";
import EditCategotyForm from "@/components/product/EditCategotyForm";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Heading from "@/components/ui/Heading";
import { prisma } from "@/src/lib/prisma";
import { notFound } from "next/navigation";

async function getCategorybyId(id: number) {
    const categoria = await prisma.categoria.findUnique({
        where: {
            id,
            estado: 1
        }
    })

    if (!categoria) {
        notFound()
    }

    return categoria
}

export default async function EditCategoryView({ params }: { params: Promise<{ id: string }>  }) {
    const { id } = await params;
    const categoria = await getCategorybyId(+id)
    return (
        <ProtectedRoute allowedRoles={[1, 3]}>
            <Heading >Editando a {categoria.nombre}</Heading>
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="w-full pt-5">
                    <EditCategotyForm categoria={categoria}>
                        <CategoryForm categoria={categoria} />
                    </EditCategotyForm>
                </div>
            </div>

        </ProtectedRoute>
    )
}
