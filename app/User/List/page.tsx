"use client";
import {
  Button,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Chip,
} from "@heroui/react";
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ListUser } from "@/actions/user/list-user-action";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Heading from "@/components/ui/Heading";
import Loading from "@/components/ui/Loading";
import CardMobile from "@/components/user/CardMobile";
import DeleteUserConfirm from "@/components/user/DeleteUserConfirm";
import { UserList } from "@/src/schema";
import { getRoleName } from "@/src/utils/rolesName";

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
        setError("Error al cargar usuarios");
        console.log("Error:", result?.error);
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
  const rowsPerPage = 10;
  const pages = Math.ceil(users.length / rowsPerPage);
  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    return users.slice(start, end);
  }, [page, users]);

  if (loading) return <Loading> Cargando usuarios...</Loading>;
  if (error)
    return (
      <div className="flex justify-center items-center min-h-[200px] text-red-500">
        Error: {error}
      </div>
    );

  return (
    <ProtectedRoute allowedRoles={[1]}>
      <Heading> Usuarios </Heading>
      <div className="p-4 md:p-8">
        <div className="flex justify-end mb-4">
          <Button color="primary" onPress={() => router.push("/User/New")}>
            <Icon
              className="md:mr-2"
              height="20"
              icon="heroicons:plus"
              width="20"
            />
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
              <TableColumn key="acciones" className="text-center">
                Acciones
              </TableColumn>
            </TableHeader>
            <TableBody items={items}>
              {(item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {`${item.primerNombre} ${item.segundoNombre ?? ""} ${item.apellidoPaterno} ${item.apellidoMaterno}`}
                  </TableCell>
                  <TableCell>{item.correo}</TableCell>
                  <TableCell>{item.celular}</TableCell>
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
                        className="transition-transform hover:scale-110"
                        href={`/User/${item.id}/Edit`}
                      >
                        <Icon
                          color="#0007fc"
                          height="24"
                          icon="iconamoon:edit-thin"
                          width="24"
                        />
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
          <CardMobile handleDeleteSuccess={handleDeleteSuccess} items={items} />

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
