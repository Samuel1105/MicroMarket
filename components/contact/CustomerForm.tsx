"use client";

import { Input } from "@heroui/react";
import { Cliente } from "@prisma/client";

type CustomerFormProps = {
  cliente?: Cliente;
};

export default function CustomerForm({ cliente }: CustomerFormProps) {
  const isEditing = !!cliente;

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        <div className="w-full">
          <Input
            required
            className="w-full"
            defaultValue={cliente?.nombre || ""}
            label="Nombre del Cliente"
            name="nombre"
          />
        </div>

        <div className="w-full">
          <Input
            required
            className="w-full"
            defaultValue={cliente?.carnet || ""}
            label="Carnet"
            name="carnet"
          />
        </div>

        <div className="w-full">
          <Input
            required
            className="w-full"
            defaultValue={cliente?.correo || ""}
            label="Correo Electrónico"
            name="correo"
            type="email"
          />
        </div>

        {isEditing && <input name="id" type="hidden" value={cliente.id} />}
      </div>
    </div>
  );
}
