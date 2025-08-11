"use client"

import { Input } from "@heroui/react"
import { Cliente } from "@prisma/client"

type CustomerFormProps = {
    cliente?: Cliente
}

export default function CustomerForm({ cliente }: CustomerFormProps) {
    const isEditing = !!cliente;
    return (
        <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                <div className="w-full">
                    <Input
                        label="Nombre del Cliente"
                        name="nombre"
                        required
                        className="w-full"
                        defaultValue={cliente?.nombre || ""}
                    />
                </div>

                <div className="w-full">
                    <Input
                        label="Carnet"
                        name="carnet"
                        required
                        className="w-full"
                        defaultValue={cliente?.carnet || ""}
                    />
                </div>

                <div className="w-full">
                    <Input
                        label="Correo Electrónico"
                        type="email"
                        name="correo"
                        required
                        className="w-full"
                        defaultValue={cliente?.correo || ""}
                    />
                </div> 
                
                {isEditing && (
                    <input type="hidden" name="id" value={cliente.id} />
                )}
            </div>
        </div>
    )
}
