"use client";
import { Input } from "@heroui/react";
import { Categoria } from "@prisma/client";
import { useFormContext } from "react-hook-form";

import { CategoryCreate } from "@/src/schema/SchemaProduts";

type CategoryFormProps = {
  categoria?: Categoria;
};

export default function CategoryForm({ categoria }: CategoryFormProps) {
  const isEditing = !!categoria;

  const {
    register,
    formState: { errors },
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
            errorMessage={errors.nombre?.message}
            isInvalid={!!errors.nombre}
          />
        </div>
        {isEditing && categoria && (
          <input name="id" type="hidden" value={categoria.id} />
        )}
      </div>
    </div>
  );
}
