"use client";
import { Button, Form } from "@heroui/react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { updateCustomerAction } from "@/actions/clientes/update-customer-action";
import { useAuth } from "@/app/context/AuthContext";
import {
  CustomerUpdate,
  CustomerUpdateSchema,
} from "@/src/schema/SchemaContact";
import { getBoliviaTime } from "@/src/utils/date";

export default function EditCustomerForm({
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
    const data: CustomerUpdate = {
      id: parseInt((formData.get("id") as string) || ""),
      nombre: (formData.get("nombre") as string) || "",
      carnet: (formData.get("carnet") as string) || "",
      correo: (formData.get("correo") as string) || "",
      fechaActualizacion: getBoliviaTime(),
      usuarioIdActualizacion: +user.id,
    };
    const result = CustomerUpdateSchema.safeParse(data);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        toast.error(issue.message);
      });

      return;
    }

    const response = await updateCustomerAction(result.data);

    if (response?.error) {
      toast.error(response.error);

      return;
    }

    if (response?.success) {
      toast.success(response.message);
      router.push("/Dashboard/Contact/Customer/List");
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
            onPress={() => router.push("/Dashboard/Contact/Customer/List")}
          >
            Cancelar
          </Button>
        </div>
      </Form>
    </div>
  );
}
