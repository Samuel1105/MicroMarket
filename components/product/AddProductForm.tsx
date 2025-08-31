"use client"
import React from 'react'
import { FormProvider } from 'react-hook-form'
import { Button } from "@heroui/react"
import { useRouter } from "next/navigation"
import { useProductForm } from '@/hooks/useProductForm'

export default function AddProductForm({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const formMethods = useProductForm()

    const {
        formState: { isSubmitting, isValid }
    } = formMethods

    const handleCancel = () => {
        if (confirm('¿Estás seguro de que deseas cancelar? Se perderán los datos no guardados.')) {
            router.push('/Dashboard/Product/List')
        }
    }

    return (
        <FormProvider {...formMethods}>
            <div className='bg-white px-6 py-6 rounded-xl shadow-large w-full border border-gray-100'>
                <form onSubmit={formMethods.onSubmit} className='w-full space-y-6'>
                    <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                        {children}
                    </div>
                   
                    <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                        <Button
                            type="submit"
                            color="primary"
                            size="lg"
                            className="flex-1 font-semibold"
                            isLoading={isSubmitting}
                            isDisabled={!isValid}
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Registrando...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Registrar Producto
                                </>
                            )}
                        </Button>
                       
                        <Button
                            color="danger"
                            variant="bordered"
                            size="lg"
                            className="flex-1 font-semibold"
                            onPress={handleCancel}
                            isDisabled={isSubmitting}
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Cancelar
                        </Button>
                    </div>
                </form>
            </div>
        </FormProvider>
    )
}