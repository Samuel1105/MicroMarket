"use client";
import { ListUser } from "@/actions/list-user-action";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Heading from "@/components/ui/Heading";
import DeleteUserConfirm from "@/components/users/DeleteUserConfirm";
import { UserList } from "@/src/schema";
import { getRoleName } from "@/src/utils/rolesName";
import { Button, Pagination, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow, Card, CardBody, Chip } from "@heroui/react";
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function UserListView() {
    const [users, setUsers] = useState<UserList>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    // Función para cargar usuarios
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const result = await ListUser();
            if (result?.data) {
                setUsers(result.data);
                setError(null);
            } else {
                setError(result?.error || "Error al cargar usuarios");
            }
        } catch (error) {
            setError("Error al conectar con el servidor" + error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Cargar usuarios al montar el componente
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Callback para refrescar después de eliminar
    const handleDeleteSuccess = useCallback(() => {
        fetchUsers();
    }, [fetchUsers]);

    const [page, setPage] = useState(1);
    const rowsPerPage = 4;
    const pages = Math.ceil(users.length / rowsPerPage);
    const items = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return users.slice(start, end);
    }, [page, users]);

    if (loading) return <div className="flex justify-center items-center min-h-[200px]">Cargando usuarios...</div>;
    if (error) return <div className="flex justify-center items-center min-h-[200px] text-red-500">Error: {error}</div>;

    return (
        <ProtectedRoute allowedRoles={[1]}>
            <Heading> Usuarios </Heading>
            <div className="p-4 md:p-8">
                <div className="flex justify-end mb-4">
                    <Button onPress={() => router.push('/User/New')} color="primary">
                        <Icon icon="heroicons:plus" width="20" height="20" className="md:mr-2" />
                        <span className="hidden md:inline">Crear Usuario</span>
                    </Button>
                </div>

                {/* Vista Desktop - Tabla */}
                <div className="hidden md:block">
                    <Table
                        aria-label="Tabla de usuarios"
                        bottomContent={
                            <div className="flex w-full justify-center">
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
                        }
                        classNames={{
                            wrapper: "min-h-[222px]",
                        }}
                    >
                        <TableHeader>
                            <TableColumn key="nombre">Nombre Completo</TableColumn>
                            <TableColumn key="correo">Correo</TableColumn>
                            <TableColumn key="celular">Celular</TableColumn>
                            <TableColumn key="rol">Rol</TableColumn>
                            <TableColumn key="acciones" className="text-center">Acciones</TableColumn>
                        </TableHeader>
                        <TableBody items={items}>
                            {(item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        {`${item.primerNombre} ${item.segundoNombre} ${item.apellidoPaterno} ${item.apellidoMaterno}`}
                                    </TableCell>
                                    <TableCell>
                                        {item.correo} 
                                    </TableCell>
                                    <TableCell>
                                        {item.celular}
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            color={item.rol === 1 ? "primary" : "secondary"} 
                                            size="sm"
                                            variant="flat"
                                        >
                                            {getRoleName(item.rol)}
                                        </Chip>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-4 justify-center">
                                            <Link 
                                                href={`/User/${item.id}/Edit`}
                                                className="transition-transform hover:scale-110"
                                            >
                                                <Icon icon="iconamoon:edit-thin" width="24" height="24" color="#0007fc" />
                                            </Link>
                                            <DeleteUserConfirm 
                                                usuario={item} 
                                                onDeleteSuccess={handleDeleteSuccess}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Vista Mobile - Cards */}
                <div className="md:hidden space-y-4">
                    {items.map((item) => (
                        <Card key={item.id} className="w-full">
                            <CardBody className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg mb-1 leading-tight">
                                            {`${item.primerNombre} ${item.segundoNombre}`}
                                        </h3>
                                        <p className="text-sm text-gray-600 mb-1">
                                            {`${item.apellidoPaterno} ${item.apellidoMaterno}`}
                                        </p>
                                        <Chip 
                                            color={item.rol === 1 ? "primary" : "secondary"} 
                                            size="sm"
                                            variant="flat"
                                        >
                                            {getRoleName(item.rol)}
                                        </Chip>
                                    </div>
                                    <div className="flex gap-2 ml-2">
                                        <Link 
                                            href={`/User/${item.id}/Edit`}
                                            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                        >
                                            <Icon icon="iconamoon:edit-thin" width="20" height="20" color="#0007fc" />
                                        </Link>
                                        <div className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                                            <DeleteUserConfirm 
                                                usuario={item} 
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
    );
}