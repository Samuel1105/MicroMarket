"use client"
import { useProductForm } from '@/hooks/useProductForm';
import { FormProvider } from 'react-hook-form';
import { Button } from '@heroui/react';

interface AddProductFormProps {
    children: React.ReactNode;
}

export default function AddProductForm({ children }: AddProductFormProps) {
    const methods = useProductForm(); // Sin producto, modo creación
    const { onSubmit, formState: { isSubmitting, isValid } } = methods;

    return (
        <FormProvider {...methods}>
            <form onSubmit={onSubmit} className="space-y-8">
                {children}
                
                {/* Botones de acción */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-4 mt-8">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                                Completa todos los campos requeridos
                            </span>
                        </div>
                        
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="bordered"
                                color="default"
                                onPress={() => window.history.back()}
                                isDisabled={isSubmitting}
                            >
                                Cancelar
                            </Button>
                            
                            <Button
                                type="submit"
                                color="success"
                                isLoading={isSubmitting}
                                isDisabled={!isValid}
                                startContent={
                                    !isSubmitting && (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    )
                                }
                            >
                                {isSubmitting ? 'Creando...' : 'Crear Producto'}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </FormProvider>
    );
}