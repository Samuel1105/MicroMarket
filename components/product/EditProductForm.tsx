"use client";
import { FormProvider } from "react-hook-form";
import { Button } from "@heroui/react";

import { useProductForm } from "@/hooks/useProductForm";
import { ProductoCompleto } from "@/src/schema/SchemaProduts";

interface EditProductFormProps {
  producto: ProductoCompleto;
  children: React.ReactNode;
}

export default function EditProductForm({
  producto,
  children,
}: EditProductFormProps) {
  const methods = useProductForm({ producto, isEditMode: true });
  const {
    onSubmit,
    formState: { isSubmitting, isDirty, isValid },
  } = methods;

  return (
    <FormProvider {...methods}>
      <form className="space-y-5 pb-4" onSubmit={onSubmit}>
        {children}

        {/* Botones de acción */}
        <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex justify-between items-center">
            <div className="hidden items-center gap-2 sm:flex">
              {isDirty && (
                <span className="text-sm text-amber-600 flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                  Hay cambios sin guardar
                </span>
              )}
            </div>

            <div className="flex w-full gap-3 sm:w-auto">
              <Button
                className="flex-1 sm:flex-none"
                color="primary"
                isDisabled={!isDirty || !isValid}
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
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  )
                }
                type="submit"
              >
                {isSubmitting ? "Actualizando..." : "Actualizar Producto"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
