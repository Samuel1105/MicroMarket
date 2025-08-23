import { SupplierList } from '@/src/schema/SchemaContact'
import { Card, CardBody, Link } from '@heroui/react'
import React from 'react'

import { Icon } from '@iconify/react/dist/iconify.js'

import DeleteSupplierConfirm from './DeleteSupplierConfirm'

export default function CardMobileSuppplier({ items, handleDeleteSuccess }: { items: SupplierList, handleDeleteSuccess: () => void }) {
    return (
        <>
            {items.map((item) => (
                <Card key={item.id} className="w-full">
                    <CardBody className="p-4">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                                <h2 className="font-semibold text-lg mb-1 leading-tight">
                                    {`${item.nombre} `}
                                </h2>
                                {item.direccion && (
                                    <div className='flex items-center gap-2'>
                                        <Icon icon="heroicons:map-pin" width="20" height="20" className="text-gray-500" />
                                        <p className="text-sm text-gray-600 mb-1">
                                            {item.direccion}
                                        </p>
                                    </div>
                                )}


                            </div>
                            <div className="flex gap-2 ml-2">
                                <Link
                                    href={`/Dashboard/Contact/Suppier/${item.id}/Edit`}
                                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <Icon icon="iconamoon:edit-thin" width="20" height="20" color="#0007fc" />
                                </Link>
                                <div className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                                    <DeleteSupplierConfirm
                                        proveedor={item}
                                        onDeleteSuccess={handleDeleteSuccess}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Icon icon="heroicons:envelope" width="16" height="16" className="text-gray-500" />
                                <span className="text-sm text-gray-700">{item.correo}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Icon icon="heroicons:phone" width="16" height="16" className="text-gray-500" />
                                <span className="text-sm text-gray-700">{item.celular}</span>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            ))}
        </>
    )
}
