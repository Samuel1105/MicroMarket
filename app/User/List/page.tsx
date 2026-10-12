"use client";
import {
  Button,
  Pagination,
} from "@heroui/react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ListUser } from "@/actions/user/list-user-action";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Heading from "@/components/ui/Heading";
import Loading from "@/components/ui/Loading";
import CardMobile from "@/components/user/CardMobile";
import { UserList } from "@/src/schema";

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

        <div className="space-y-3">
          <CardMobile handleDeleteSuccess={handleDeleteSuccess} items={items} />
        </div>

        {pages > 1 && (
          <div className="flex justify-center pt-6">
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
        )}
      </div>
    </ProtectedRoute>
  );
}
