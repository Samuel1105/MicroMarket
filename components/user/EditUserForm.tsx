"use client";

import { Button, Form } from "@heroui/react";
import { useRouter } from "next/navigation";
import React from "react";
import { toast } from "react-toastify";

import { updateUserAction } from "@/actions/user/update-user-action";
import { useAuth } from "@/app/context/AuthContext";
import { UserUpdate, userUpdateSchema } from "@/src/schema";
import { getBoliviaTime } from "@/src/utils/date";

export default function EditUserForm({
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
    const data: UserUpdate = {
      id: parseInt((formData.get("id") as string) || ""),
      primerNombre: formData.get("primerNombre") as string,
      segundoNombre: formData.get("segundoNombre") as string,
      apellidoPaterno: formData.get("apellidoPaterno") as string,
      apellidoMaterno: formData.get("apellidoMaterno") as string,
      correo: formData.get("correo") as string,
      contrase_a: (formData.get("contraseña") as string) || undefined,
      celular: parseInt((formData.get("celular") as string) || ""),
      rol: parseInt((formData.get("rol") as string) || ""),
      fechaActualizacion: getBoliviaTime(),
      usuarioIdActualizacion: +user?.id,
    };

    const result = userUpdateSchema.safeParse(data);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        toast.error(issue.message);
      });

      return;
    }
    const response = await updateUserAction(result.data);

    if (response?.errors) {
      response.errors.forEach((issue) => {
        toast.error(issue.message);
      });

      return;
    }

    if (response?.error) {
      toast.error(response.error);

      return;
    }

    if (response?.success) {
      toast.success(response.message);
      router.push("/User/List");
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
            onPress={() => router.push("/User/List")}
          >
            Cancelar
          </Button>
        </div>
      </Form>
    </div>
  );
}
