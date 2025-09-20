"use client";

import { Button, Form } from "@heroui/react";
import { useRouter } from "next/navigation";
import React from "react";
import { toast } from "react-toastify";

import { updateSupplierAction } from "@/actions/proveedores/update-supplier";
import { useAuth } from "@/app/context/AuthContext";
import {
  SupplierUpdate,
  SupplierUpdateSchema,
} from "@/src/schema/SchemaContact";
import { getBoliviaTime } from "@/src/utils/date";

export default function EditSupplierForm({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user } = useAuth();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!user) {
      return;
    }

    // Convertir celular a número y validar antes de enviar
    const celularValue = formData.get("celular") as string;
    const celularNumero = celularValue ? parseInt(celularValue) : 0;

    if (
      celularValue &&
      (isNaN(celularNumero) ||
        celularValue.length !== 8 ||
        !/^[67]/.test(celularValue))
    ) {
      alert(
        "Por favor ingrese un número de celular válido (8 dígitos comenzando con 6 o 7)",
      );

      return;
    }

    const data: SupplierUpdate = {
      id: parseInt(formData.get("id") as string),
      nombre: (formData.get("nombre") as string) || "",
      celular: celularNumero,
      correo: (formData.get("correo") as string) || "",
      direccion: (formData.get("direccion") as string) || "",
      fechaActualizacion: getBoliviaTime(),
      usuarioIdActualizacion: +user.id,
    };

    const result = SupplierUpdateSchema.safeParse(data);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        toast.error(issue.message);
      });

      return;
    }

    const response = await updateSupplierAction(result.data);

    if (response?.error) {
      toast.error(response.error);

      return;
    }

    if (response?.success) {
      toast.success(response.message);
      router.push("/Dashboard/Contact/Suppier/List");
    }
  };

  return (
    <div className="bg-white px-8 py-10 rounded-lg shadow-large w-full">
      <Form className="w-full" onSubmit={handleSubmit}>
        <div className="w-full">{children}</div>
        <div className="mt-5 w-full space-x-5">
          <Button className="mt-4" color="primary" type="submit">
            Guardar Cambios
          </Button>
          <Button
            className="mt-4"
            color="danger"
            onPress={() => router.push("/Dashboard/Contact/Suppier/List")}
          >
            Cancelar
          </Button>
        </div>
      </Form>
    </div>
  );
}
