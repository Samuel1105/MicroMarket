"use client"
import { updateCategory } from "@/actions/products/update-category";
import { useAuth } from "@/app/context/AuthContext";
import { categoryUpdate, CategoryUpdate } from "@/src/schema/SchemaProduts";
import { getBoliviaTime } from "@/src/utils/date";
import { Button } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Categoria } from "@prisma/client";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "react-toastify";

type EditCategoryFormProps = {
    children: React.ReactNode;
    categoria: Categoria; // ✅ Recibe la categoría como prop
}

export default function EditCategotyForm({ children, categoria }: EditCategoryFormProps) {

    const router = useRouter()
    const { user } = useAuth()

    const methods = useForm<CategoryUpdate>({
        resolver: zodResolver(categoryUpdate),
        defaultValues: {
            id: categoria.id,
            nombre: categoria.nombre,
            fechaActualizacion: getBoliviaTime(),
            usuarioIdActualizacion: user?.id
        }
    })

    const { handleSubmit, formState: { isSubmitting } } = methods

    const onSubmit = async (data: CategoryUpdate) => {
        try {
            const result = await updateCategory(data)
            if (result.success) {
                toast.success(result.message)
                router.push('/Dashboard/Product/Category/List')
            }
            if (result.error) {
                toast.error(result.error)
            }

        } catch (error) {
            console.error("Error al crear categoría:", error)
        }
    }

    return (
        <div className="bg-white px-5 py-5 rounded-lg shadow-large w-full">
            <FormProvider {...methods}>
                <form className="w-full" onSubmit={handleSubmit(onSubmit)}>
                    <div className='w-full'>
                        {children}
                    </div>
                    <div className="mt-5 w-full space-x-5">
                        <Button
                            type="submit"
                            color="primary"
                            className="mt-4"
                            isLoading={isSubmitting}
                        >
                            {isSubmitting ? "Guardando..." : "Guardar"}
                        </Button>
                        <Button
                            color="danger"
                            className="mt-4"
                            onPress={() => router.push('/Dashboard/Product/Category/List')}
                        >
                            Cancelar
                        </Button>
                    </div>
                </form>
            </FormProvider>

        </div>
    )
}
