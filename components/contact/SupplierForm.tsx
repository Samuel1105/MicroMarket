"use client";

import { Input } from "@heroui/react";
import { Proveedor } from "@prisma/client";
import { useState } from "react";

type SupplierFormProps = {
  proveedor?: Proveedor;
};

export default function SupplierForm({ proveedor }: SupplierFormProps) {
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
            required
            className="w-full"
            defaultValue={proveedor?.nombre || ""}
            label="Nombre del Proveedor"
            name="nombre"
          />
        </div>

        <div className="w-full">
          <Input
            required
            className="w-full"
            defaultValue={proveedor?.celular?.toString() || ""}
            description="Ingrese 8 dígitos comenzando con 6 o 7"
            errorMessage={celularError}
            inputMode="numeric"
            isInvalid={!!celularError}
            label="Celular"
            name="celular"
            pattern="[67][0-9]{7}"
            type="tel" // Cambiado a tel para mejor soporte en móviles
            onChange={handleCelularChange}
          />
        </div>

        <div className="w-full">
          <Input
            className="w-full"
            defaultValue={proveedor?.correo || ""}
            label="Correo Electrónico"
            name="correo"
            type="email"
          />
        </div>

        <div className="w-full">
          <Input
            className="w-full"
            defaultValue={proveedor?.direccion || ""}
            label="Dirección"
            name="direccion"
          />
        </div>

        {isEditing && <input name="id" type="hidden" value={proveedor.id} />}
      </div>
    </div>
  );
}
