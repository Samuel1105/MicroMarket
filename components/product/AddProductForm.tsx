"use client";
import { FormProvider } from "react-hook-form";
import { Button } from "@heroui/react";

import { useProductForm } from "@/hooks/useProductForm";

interface AddProductFormProps {
  children: React.ReactNode;
}

export default function AddProductForm({ children }: AddProductFormProps) {
  const methods = useProductForm(); // Sin producto, modo creación
  const {
    onSubmit,
    formState: { isSubmitting, isValid },
  } = methods;

  return (
    <FormProvider {...methods}>
      <form className="space-y-5 pb-4" onSubmit={onSubmit}>
        {children}

        {/* Botones de acción */}
        <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex justify-between items-center">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-sm text-gray-500">
                Completa todos los campos requeridos
              </span>
            </div>

            <div className="flex w-full gap-3 sm:w-auto">
              <Button
                className="flex-1 sm:flex-none"
                color="default"
                isDisabled={isSubmitting}
                type="button"
                variant="bordered"
                onPress={() => window.history.back()}
              >
                Cancelar
              </Button>

              <Button
                className="flex-1 sm:flex-none"
                color="success"
                isDisabled={!isValid}
                isLoading={isSubmitting}
                startContent={
                  !isSubmitting && (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M12 4v16m8-8H4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  )
                }
                type="submit"
              >
                {isSubmitting ? "Creando..." : "Crear Producto"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
