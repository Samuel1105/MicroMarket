"use client";

import { Button, Form } from "@heroui/react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { createCustomerAction } from "@/actions/clientes/create-customer-action";
import { useAuth } from "@/app/context/AuthContext";
import {
  CustomerCreate,
  CustomerCreateSchema,
} from "@/src/schema/SchemaContact";

export default function AddCustomerForm({
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

    const data: CustomerCreate = {
      nombre: (formData.get("nombre") as string) || "",
      carnet: (formData.get("carnet") as string) || "",
      correo: (formData.get("correo") as string) || "",
      usuarioIdRegistro: +user.id,
    };
    const result = CustomerCreateSchema.safeParse(data);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        toast.error(issue.message);
      });

      return;
    }

    const response = await createCustomerAction(result.data);

    if (response.error) {
      toast.error(response.error);
    }

    if (response.success) {
      toast.success(response.message);
      router.push("/Dashboard/Contact/Customer/List");
    }
  };

  return (
    <div className="bg-white px-5 py-5 rounded-lg shadow-large w-full">
      <Form className="w-full" onSubmit={handleSubmit}>
        <div className="w-full">{children}</div>
        <div className="mt-5 w-full space-x-5">
          <Button className="mt-4" color="primary" type="submit">
            Registrar
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
