'use client'
import { createUserAction } from "@/actions/user/create-user-action"
import { useAuth } from "@/app/context/AuthContext"
import { UserCreate, userCreateSchema } from "@/src/schema"
import { Button, Form } from "@heroui/react"
import { useRouter } from "next/navigation"
import React from "react"
import { toast } from "react-toastify"

export default function AddUserForm({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const { user } = useAuth()

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        if (!user) {
            return;
        }
        const data: UserCreate = {
            primerNombre: (formData.get('primerNombre') as string) || "",
            segundoNombre: formData.get('segundoNombre') as string || null,
            apellidoPaterno: formData.get('apellidoPaterno') as string,
            apellidoMaterno: formData.get('apellidoMaterno') as string,
            correo: formData.get('correo') as string,
            contraseña: formData.get('contraseña') as string,
            celular: parseInt((formData.get('celular') as string) || '0'),
            rol: parseInt((formData.get('rol') as string) || '0'),
            usuarioIdRegistro: +user?.id
        }

        const result = userCreateSchema.safeParse(data);
        
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

        if (response?.error) {
            toast.error(response.error)
            return
        }

        if (response?.success) {
            toast.success(response.message)
            router.push('/User/List')
        }
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
                    <Button color="danger" className="mt-4" onPress={() => router.push('/User/List')}>
                        Cancelar
                    </Button>
                </div>
            </Form>
        </div>
    )
}