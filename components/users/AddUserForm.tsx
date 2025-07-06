'use client'
import { createUserAction } from "@/actions/create-user-action"
import { userFormSchema } from "@/src/schema"
import { Button, Form } from "@heroui/react"
import { useRouter } from "next/navigation"
import React from "react"
import { toast } from "react-toastify"

export default function AddUserForm({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        const data = {
            primerNombre: formData.get('primerNombre'),
            segundoNombre: formData.get('segundoNombre'),
            apellidoPaterno: formData.get('apellidoPaterno'),
            apellidoMaterno: formData.get('apellidoMaterno'),
            correo: formData.get('correo'),
            contraseña: formData.get('contraseña'),
            celular: parseInt((formData.get('celular') as string) || '') ,
            rol: parseInt((formData.get('rol') as string) || '') ,
        }

        
        const result = userFormSchema.safeParse(data);
        console.log(result)
        if (!result.success) {
            result.error.issues.forEach(issue => {
                toast.error(issue.message)
            })

            return
        }

        const response = await createUserAction(result.data)
        
        if (response?.errors) {
            response.errors.forEach(issue => {
                toast.error(issue.message)
            })
            return
        }

        if(response?.error){
            toast.error(response.error)
            return
        }

        toast.success(response.message)
        
        router.push('/User/List')

    }
    return (
        <div className="bg-white px-8 py-10 rounded-lg shadow-large w-full">

            <Form className="w-full" onSubmit={handleSubmit}>
                <div className="w-full">
                    {children}
                </div>
                <div className="mt-5 w-full space-x-5">
                    <Button type="submit" color="primary" className="mt-4">
                        Registrar
                    </Button>
                    <Button color="danger" className="mt-4">
                        Cancelar
                    </Button>
                </div>
            </Form>
        </div>
    )
}