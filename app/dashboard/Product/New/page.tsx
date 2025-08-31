"use client"
import React from 'react'
import { FormProvider } from 'react-hook-form'
import AddProductForm from '@/components/product/AddProductForm'
import ProductForm from '@/components/product/ProductForm'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Heading from '@/components/ui/Heading'
import { useProductForm } from '@/hooks/useProductForm'

export default function CreateProductView() {
    const formMethods = useProductForm();

    return (
        <ProtectedRoute allowedRoles={[1, 2]}>
            <div className="container mx-auto px-4">
                <Heading>Crear Producto</Heading>
                
                <FormProvider {...formMethods}>
                    <AddProductForm onSubmit={formMethods.onSubmit} >
                        <ProductForm />
                    </AddProductForm>
                </FormProvider>
            </div>
        </ProtectedRoute>
    )
}