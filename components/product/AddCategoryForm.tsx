"use client"
import { useAuth } from "@/app/context/AuthContext"
import { Button } from "@heroui/react"
import { useRouter } from "next/navigation"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { categoryCreate, CategoryCreate } from "@/src/schema/SchemaProduts"
import { getBoliviaTime } from "@/src/utils/date"
import { CreateCategoty } from "@/actions/products/create-category"
import { toast } from "react-toastify"

export default function AddCategoryForm({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const { user } = useAuth()
    
    const methods = useForm<CategoryCreate>({
        resolver: zodResolver(categoryCreate),
        defaultValues: {
            nombre: "",
            fechaRegistro: getBoliviaTime(),
            usuarioIdRegistro: user?.id,
        }
    })

    const { handleSubmit, formState: {  isSubmitting  } } = methods

    const onSubmit = async (data: CategoryCreate) => {
        try {            

            const response  = await CreateCategoty(data)

            if (response.success) {
                toast.success(response.message)
                router.push('/Dashboard/Product/Category/List')
            }

            if(response.error) {
                toast.error(response.error)
            }
            
        } catch (error) {
            console.error("Error al crear categoría:", error)
        }
    }

    return (
        <div className='bg-white px-5 py-5 rounded-lg shadow-large w-full'>
            <FormProvider {...methods}>
                <form className='w-full' onSubmit={handleSubmit(onSubmit)}>
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
                            {isSubmitting ? "Registrando..." : "Registrar"}
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