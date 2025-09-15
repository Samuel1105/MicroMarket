"use client"
import { CategoryCreate } from "@/src/schema/SchemaProduts";
import { Input } from "@heroui/react";
import { Categoria } from "@prisma/client";
import { useFormContext } from "react-hook-form";


type CategoryFormProps = {
    categoria?: Categoria
}

export default function CategoryForm({ categoria }: CategoryFormProps) {
    const isEditing = !!categoria;
    
    const {
        register,
        formState: { errors }
    } = useFormContext<CategoryCreate>();

    return (
        <div className="w-full">
            <div className="grid grid-cols-1 w-full">
                <div className="w-full">
                    <Input
                        label="Nombre de la Categoria"
                        {...register("nombre")}
                        //required
                        className="w-full"
                        defaultValue={categoria?.nombre || ""}
                        isInvalid={!!errors.nombre}
                        errorMessage={errors.nombre?.message}
                    />
                </div>
                {isEditing && categoria && (
                    <input type="hidden" name="id" value={categoria.id} />
                )}
            </div>
        </div>
    )
}