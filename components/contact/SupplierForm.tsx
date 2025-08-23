"use client"

import { Input } from "@heroui/react";
import { Proveedor } from "@prisma/client"
import { useState } from "react";

type SupplierFormProps = {
    proveedor?: Proveedor
}

export default function SupplierForm({proveedor} : SupplierFormProps) {
    const isEditing = !!proveedor;
    const [celularError, setCelularError] = useState<string | null>(null);

    const handleCelularChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        
        // Permitir solo números y máximo 8 dígitos
        if (/^\d{0,8}$/.test(value)) {
            // Validar formato boliviano solo cuando se complete el campo
            if (value.length === 8 && !/^[67]/.test(value)) {
                setCelularError("El número debe comenzar con 6 o 7");
            } else {
                setCelularError(null);
            }
        }
    };

    return (
        <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                <div className="w-full">
                    <Input
                        label="Nombre del Proveedor"
                        name="nombre"
                        required
                        className="w-full"
                        defaultValue={proveedor?.nombre || ""}
                    />
                </div>
                
                <div className="w-full">
                    <Input
                        label="Celular"
                        name="celular"
                        type="tel" // Cambiado a tel para mejor soporte en móviles
                        required
                        className="w-full"
                        defaultValue={proveedor?.celular?.toString() || ""}
                        onChange={handleCelularChange}
                        isInvalid={!!celularError}
                        errorMessage={celularError}
                        description="Ingrese 8 dígitos comenzando con 6 o 7"
                        pattern="[67][0-9]{7}"
                        inputMode="numeric"
                    />
                </div>

                <div className="w-full">
                    <Input
                        label="Correo Electrónico"
                        type="email"
                        name="correo"
                        className="w-full"
                        defaultValue={proveedor?.correo || ""}
                    />
                </div> 

                <div className="w-full">
                    <Input
                        label="Dirección"
                        name="direccion"
                        className="w-full"
                        defaultValue={proveedor?.direccion || ""}
                    />
                </div> 
                
                {isEditing && (
                    <input type="hidden" name="id" value={proveedor.id} />
                )}
            </div>
        </div>
    )
}