"use client";
import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";

import { categoryCreate, CategoryCreate } from "@/src/schema/SchemaProduts";
import { getBoliviaTime } from "@/src/utils/date";
import { CreateCategoty } from "@/actions/products/create-category";
import { useAuth } from "@/app/context/AuthContext";

export default function AddCategoryForm({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user } = useAuth();

  const methods = useForm<CategoryCreate>({
    resolver: zodResolver(categoryCreate),
    defaultValues: {
      nombre: "",
      fechaRegistro: getBoliviaTime(),
      usuarioIdRegistro: user?.id,
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = async (data: CategoryCreate) => {
    try {
      const response = await CreateCategoty(data);

      if (response.success) {
        toast.success(response.message);
        router.push("/Dashboard/Product/Category/List");
      }

      if (response.error) {
        toast.error(response.error);
      }
    } catch (error) {
      console.error("Error al crear categoría:", error);
    }
  };

  return (
    <div className="bg-white px-5 py-5 rounded-lg shadow-large w-full">
      <FormProvider {...methods}>
        <form className="w-full" onSubmit={handleSubmit(onSubmit)}>
          <div className="w-full">{children}</div>
          <div className="mt-5 w-full space-x-5">
            <Button
              className="mt-4"
              color="primary"
              isLoading={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Registrando..." : "Registrar"}
            </Button>
            <Button
              className="mt-4"
              color="danger"
              onPress={() => router.push("/Dashboard/Product/Category/List")}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
