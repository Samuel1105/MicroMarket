"use client"
import { createUnidadMedida } from '@/actions/products/list-productInfo-action';
import { useAuth } from '@/app/context/AuthContext';
import { UnidadMedidaCreate, unidadMedidaCreateSchema } from '@/src/schema/SchemaProduts';
import { Button, Form } from '@heroui/react';
import { useRouter } from 'next/navigation';
import React from 'react'
import { toast } from 'react-toastify';

export default function AddUnitForm({
    children
}:{
  children: React.ReactNode;
} ) {
  const router = useRouter();
  const { user } = useAuth();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
  
      if (!user) {
        return;
      }
  
      const data: UnidadMedidaCreate = {
        nombre: (formData.get("nombre") as string) || "",
        abreviatura: (formData.get("abreviatura") as string) || "",
      
      };
      const result = unidadMedidaCreateSchema.safeParse(data);
  
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          toast.error(issue.message);
        });
  
        return;
      }
  
      const response = await createUnidadMedida(result.data);
  
      if (response.error) {
        toast.error(response.error);
      }
  
      if (response.success) {
        toast.success(response.message);
        router.push("/Dashboard/Config/Unit/List");
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
            onPress={() => router.push("/Dashboard/Config/Unit/List")}
          >
            Cancelar
          </Button>
        </div>
      </Form>
    </div>
  )
}
