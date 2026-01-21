"use client"
import { unidadMedidaList } from '@/actions/products/list-productInfo-action'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Heading from '@/components/ui/Heading'
import Loading from '@/components/ui/Loading'
import CardMobileUnits from '@/components/unit/CardMobileUnits'
import { UnidadMedidaList } from '@/src/schema/SchemaProduts'

import { Button, Link, Pagination, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/react'
import { Icon } from '@iconify/react'
import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

export default function page() {
    const [units, setUnits] = useState<UnidadMedidaList>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const fetchUnits = useCallback(async () => {
        try {
            setLoading(true)
            const result = await unidadMedidaList()
           
            if (result.data) {
                setUnits(result.data)
                setError(null)
            } else {
                setError("Error la cargar unidades de medida")
                console.log("Error:", result.error)
            }
        } catch (error) {
            setError("Error al conectar con el servidor" + error)
        } finally {
            setLoading(false)
        }


    }, [])

    useEffect(() => {
        fetchUnits()
    }, [fetchUnits])

    const [page, setPages] = useState(1)
    const rowsPerPage = 10
    const pages = Math.ceil(units.length / rowsPerPage)
    const items = useMemo(() => {
        const start = (page - 1) * rowsPerPage
        const end = start + rowsPerPage

        return units.slice(start, end)
    }, [page, units])

    if (loading) return <Loading> Cargando unidades de medida... </Loading>
    if (error)
        return (
            <div className="flex justify-center items-center min-h-[200px] text-red-500">
                Error: {error}
            </div>
        );

    return (
        <ProtectedRoute allowedRoles={[1, 2]}>
            <Heading> Unidades de Medida </Heading>
            <div className='p-4 md:p-8'>
                <div className='flex justify-end mb-4'>
                    <Button color='primary' onPress={() => router.push("/Dashboard/Config/Unit/New")} >
                        <Icon
                            className='md:mr-2'
                            height={20}
                            icon="heroicons:plus"
                            width={20}
                        />
                        Crear Unidad de Medida
                    </Button>
                </div>

                {/* Vista de Computadora*/}
                <div className='hidden md:block'>
                    <Table
                        aria-label='Tabla de Unidades de Medida'
                        bottomContent={
                            <div className='flex w-full justify-center'>
                                <Pagination
                                    isCompact
                                    showControls
                                    showShadow
                                    color='secondary'
                                    page={page}
                                    total={pages}
                                    onChange={(page) => setPages(page)}
                                />
                            </div>

                        }
                        classNames={{
                            wrapper: "min-h-[222px]",
                        }}
                    >
                        <TableHeader>
                            <TableColumn> Nombre </TableColumn>
                            <TableColumn> Abriviatura </TableColumn>
                            <TableColumn key="acciones" className="text-center">
                                Acciones
                            </TableColumn>
                        </TableHeader>
                        <TableBody items={items}>
                            {(item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.nombre}</TableCell>
                                    <TableCell>{item.abreviatura}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-4 justify-center">
                                            <Link
                                                className="transition-transform hover:scale-110"
                                                href={`/Dashboard/Config/Unit/${item.id}/Edit`}
                                            >
                                                <Icon
                                                    color="#0007fc"
                                                    height="24"
                                                    icon="iconamoon:edit-thin"
                                                    width="24"
                                                />
                                            </Link>
                                            {/* <DeleteUserConfirm
                                                usuario={item}
                                                onDeleteSuccess={handleDeleteSuccess}
                                            /> */}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Vista de Celular*/}
                <div className='md:hidden space-y-4'>
                    <CardMobileUnits items={items} />

                    {/* Pagination para móvil */}
                    <div className="flex justify-center pt-4">
                        <Pagination
                            isCompact
                            showControls
                            showShadow
                            color="secondary"
                            page={page}
                            total={pages}
                            onChange={(page) => setPages(page)}
                        />
                    </div>
                </div>

            </div>
        </ProtectedRoute>
    )
}
