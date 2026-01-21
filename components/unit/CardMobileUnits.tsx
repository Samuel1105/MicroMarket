import { UnitList } from '@/src/schema/SchemaUnit'
import { Card, CardBody, Link, Chip } from '@heroui/react'
import { Icon } from '@iconify/react'
import React from 'react'

export default function CardMobileUnits({
    items
}: {
    items: UnitList
}) {
    return (
        <>
            {items.map((item) => (
                <Card key={item.id} className='w-full shadow-sm hover:shadow-md transition-shadow'>
                    <CardBody className='p-4'>
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1">
                                {/* <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                                    <Icon
                                        className="text-blue-600"
                                        height="20"
                                        icon="material-symbols:straighten"
                                        width="20"
                                    />
                                </div> */}
                                <div className="flex-1">
                                    <h3 className="font-semibold text-base text-gray-800 mb-0.5">
                                        {item.nombre}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">Abreviatura:</span>
                                        <Chip 
                                            size="sm" 
                                            variant="flat" 
                                            color="primary"
                                            className="font-mono font-semibold text-xs"
                                        >
                                            {item.abreviatura}
                                        </Chip>
                                    </div>
                                </div>
                            </div>
                            <Link
                                className="p-2 rounded-full hover:bg-blue-50 transition-colors flex-shrink-0"
                                href={`/User/${item.id}/Edit`}
                            >
                                <Icon
                                    color="#0007fc"
                                    height="20"
                                    icon="iconamoon:edit-thin"
                                    width="20"
                                />
                            </Link>
                        </div>
                    </CardBody>
                </Card>
            ))}
        </>
    )
}