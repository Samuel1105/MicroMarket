"use client";

import { ListUser } from "@/actions/list-user-action";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Heading from "@/components/ui/Heading";
import { UserList } from "@/src/schema";
import { getRoleName } from "@/src/utils/rolesName";
import { Button, Pagination, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function UserListView() {
    const [users, setUsers] = useState<UserList>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter()

    useEffect(() => {
        async function fetchData() {
            try {
                const result = await ListUser();
                if (result?.data) {
                    setUsers(result.data);
                } else {
                    setError(result?.error || "Error al cargar usuarios");
                }
            } catch (error) {
                setError("Error al conectar con el servidor" + error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const [page, setPage] = useState(1);
    const rowsPerPage = 4;

    const pages = Math.ceil(users.length / rowsPerPage);

    const items = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;

        return users.slice(start, end);
    }, [page, users]);

    if (loading) return <div>Cargando usuarios...</div>;
    if (error) return <div>Error: {error}</div>;

    

    return (
        <ProtectedRoute allowedRoles={[1]}>
            <Heading> Usuarios </Heading>
            <div className="p-8">
                <div className="flex justify-end mb-4">
                    <Button onPress={() => router.push('/User/New')} color="primary">Crear Usuario</Button>
                </div>
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
                        <TableColumn key="acciones">{""}</TableColumn>
                    </TableHeader>
                    <TableBody items={items}>
                        {(item) => (
                            <TableRow key={item.id}>
                                <TableCell>
                                    {`${item.primerNombre} ${item.segundoNombre} ${item.apellidoPaterno} ${item.apellidoPaterno}`}
                                </TableCell>
                                <TableCell>
                                    {item.correo}
                                </TableCell>
                                <TableCell>
                                    {item.celular}
                                </TableCell>
                                <TableCell>
                                    {getRoleName(item.rol)}
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-4">

                                        <button>
                                            <Icon icon="iconamoon:edit-thin" width="24" height="24" color="#0007fc" />
                                        </button>

                                        <button >
                                            <Icon icon="weui:delete-outlined" width="24" height="24" color="red" />
                                        </button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </ProtectedRoute>

    );
}