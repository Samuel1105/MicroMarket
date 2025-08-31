"use client"
import { ListSuppliers } from '@/actions/proveedores/list-supplier-action'
import CardMobileSuppplier from '@/components/contact/CardMobileSupplier'
import DeleteSupplierConfirm from '@/components/contact/DeleteSupplierConfirm'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Heading from '@/components/ui/Heading'
import Loading from '@/components/ui/Loading'
import { SupplierList } from '@/src/schema/SchemaContact'
import { Button, Link, Pagination, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/react'
import { Icon } from '@iconify/react/dist/iconify.js'
import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

export default function SupplierListView() {
    const [suppliers, setSupplers] = useState<SupplierList>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter()

    const fetchSuppliers = useCallback(async () => {
        try {
            setLoading(true)
            const result = await ListSuppliers()
            if (result.data) {
                setSupplers(result.data)
                setError(null)
            } else {
                setError(result.error)
                console.log("Error:", result?.error);
            }

        } catch (error) {
            setError("Error al conectar con el servidor" + error);
        }
        finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    const handleDeleteSuccess = useCallback(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    const [page, setPage] = useState(1);
    const rowsPerPage = 10;
    const pages = Math.ceil(suppliers.length / rowsPerPage);
    const items = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return suppliers.slice(start, end);
    }, [page, suppliers]);

    if (loading) return <Loading> Cargando proveedores...</Loading>
    if (error) return <div className="flex justify-center items-center min-h-[200px] text-red-500">Error: {error}</div>;
    return (
        <ProtectedRoute allowedRoles={[1, 3, 4]}>
            <Heading> Proveedores </Heading>
            <div className="p-4 md:p-8">
                <div className="flex justify-end mb-4">
                    <Button onPress={() => router.push('/Dashboard/Contact/Suppier/New')} color="primary">
                        <Icon icon="heroicons:plus" width="20" height="20" className="md:mr-2" />
                        <span className="hidden md:inline">Registrar Proveedor</span>
                    </Button>
                </div>

                <div className='hidden md:block'>
                    <Table
                        aria-label='Tabla de Proveedores'
                        bottomContent={
                            <div className='flex justify-center'>
                                <Pagination
                                    isCompact
                                    showControls
                                    showShadow
                                    color='secondary'
                                    page={page}
                                    total={pages}
                                    onChange={(page) => setPage(page)}
                                />
                            </div>
                        }
                        classNames={{
                            wrapper: "min-h-[222px]"
                        }}
                    >
                        <TableHeader>
                            <TableColumn key="nombre">Nombre</TableColumn>
                            <TableColumn key="correo">Correo</TableColumn>
                            <TableColumn key="celular">Celular</TableColumn>
                            <TableColumn key="direccion">Direccion</TableColumn>
                            <TableColumn key="acciones" className="text-center">Acciones</TableColumn>
                        </TableHeader>
                        <TableBody items={items}>
                            {(item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        {item.nombre}
                                    </TableCell>
                                    <TableCell>
                                        {item.correo}
                                    </TableCell>
                                    <TableCell>
                                        {item.celular}
                                    </TableCell>
                                    <TableCell>
                                        {item.direccion}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-4 justify-center">
                                            <Link
                                                href={`/Dashboard/Contact/Suppier/${item.id}/Edit`}
                                                className="transition-transform hover:scale-110"
                                            >
                                                <Icon icon="iconamoon:edit-thin" width="24" height="24" color="#0007fc" />
                                            </Link>
                                            <DeleteSupplierConfirm
                                                proveedor={item}
                                                onDeleteSuccess={handleDeleteSuccess}
                                            />

                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                </div>

                <div className="md:hidden space-y-4">

                    <CardMobileSuppplier items={items} handleDeleteSuccess={handleDeleteSuccess} />

                    {/* Pagination para móvil */}
                    <div className="flex justify-center pt-4">
                        <Pagination
                            isCompact
                            showControls
                            showShadow
                            color="secondary"
                            page={page}
                            total={pages}
                            onChange={(page) => setPage(page)}
                        />
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    )
}
