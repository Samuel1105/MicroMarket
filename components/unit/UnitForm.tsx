"use client"

import { Input } from "@heroui/react";
import { UnidadMedida } from "@prisma/client";

type UnitFormProps = {
    unit?: UnidadMedida;
}

export default function UnitForm({ unit }: UnitFormProps) {
    const isEditing = !!unit;
    return (
        <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            <div className="w-full">
                <Input
                    required
                    className="w-full"
                    defaultValue={unit?.nombre || ""}
                    label="Nombre del unidad"
                    name="nombre"
                />
            </div>

            <div className="w-full">
                <Input
                    required
                    className="w-full"
                    defaultValue={unit?.abreviatura || ""}
                    label="Abreviatura"
                    name="abreviatura"
                />
            </div>


            {isEditing && <input name="id" type="hidden" value={unit.id} />}
        </div>
    </div>
    )
    
}