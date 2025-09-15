"use client"
import { ListCustomer } from '@/actions/clientes/list-customer-action'
import CardMobileCustomer from '@/components/contact/CardMobileCustomer'
import DeleteCustomerConfirm from '@/components/contact/DeleteCustomerConfirm'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Heading from '@/components/ui/Heading'
import Loading from '@/components/ui/Loading'
import { CustomerList } from '@/src/schema/SchemaContact'
import { Button, Link, Pagination, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/react'
import { Icon } from '@iconify/react/dist/iconify.js'
import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

export default function ContactListView() {

    const [clients, setClients] = useState<CustomerList>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter()

    const fetchClients = useCallback(async () => {
        try {
            setLoading(true)
            const result = await ListCustomer()
            if (result.data) {
                setClients(result.data)
                setError(null)
            } else {
                setError("Error al cargar clientes")
                console.log("Error:", result?.error);
            }

        } catch (error) {
            setError("Error al conectar con el servidor" + error);
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const handleDeleteSuccess = useCallback(() => {
        fetchClients();
    }, [fetchClients]);

    const [page, setPage] = useState(1);
    const rowsPerPage = 10;
    const pages = Math.ceil(clients.length / rowsPerPage);
    const items = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return clients.slice(start, end);
    }, [page, clients]);

    if (loading) return <Loading> Cargando clientes...</Loading>
    if (error) return <div className="flex justify-center items-center min-h-[200px] text-red-500">Error: {error}</div>;

    return (
        <ProtectedRoute allowedRoles={[1, 3, 4]}>
            <Heading> Clientes </Heading>
            <div className='p-4 md:p-8'>
                <div className="flex justify-end mb-4">
                    <Button onPress={() => router.push('/Dashboard/Contact/Customer/New')} color="primary">
                        <Icon icon="heroicons:plus" width="20" height="20" className="md:mr-2" />
                        <span className="hidden md:inline">Registrar Cliente</span>
                    </Button>
                </div>
                <div className='hidden md:block'>
                    <Table
                        aria-label="Lista de Clientes"
                        bottomContent={
                            <div className='flex w-full justify-center'>
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
                            <TableColumn key="carnet">Carnet</TableColumn>
                            <TableColumn key="correo">Correo</TableColumn>
                            <TableColumn key="acciones" className="text-center">Acciones</TableColumn>
                        </TableHeader>
                        <TableBody items={items}>
                            {(item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        {item.nombre}
                                    </TableCell>
                                    <TableCell>
                                        {item.carnet}
                                    </TableCell>
                                    <TableCell>
                                        {item.correo}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-4 justify-center">
                                            <Link
                                                href={`/Dashboard/Contact/Customer/${item.id}/Edit`}
                                                className="transition-transform hover:scale-110"
                                            >
                                                <Icon icon="iconamoon:edit-thin" width="24" height="24" color="#0007fc" />
                                            </Link>
                                            <DeleteCustomerConfirm
                                                cliente={item}
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

                    <CardMobileCustomer items={items} handleDeleteSuccess={handleDeleteSuccess} />

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
