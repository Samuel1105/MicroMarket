import React from 'react'
import ProductFormBasic from './ProductFormBasic'
import ProductFormUnidades from './ProductFormUnidades'

export default function ProductForm() {
    return (
        <>
            {/* Información básica del producto */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">Información Básica</h3>
                </div>
                <ProductFormBasic />
            </div>
            
            {/* Unidades y conversiones */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <div className="p-2 bg-green-100 rounded-lg">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">Unidades de Medida</h3>
                </div>
                <ProductFormUnidades />
            </div>
        </>
    )
}