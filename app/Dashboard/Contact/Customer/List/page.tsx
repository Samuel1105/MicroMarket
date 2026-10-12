"use client";
import {
  Button,
  Pagination,
} from "@heroui/react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { ListCustomer } from "@/actions/clientes/list-customer-action";
import CardMobileCustomer from "@/components/contact/CardMobileCustomer";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Heading from "@/components/ui/Heading";
import Loading from "@/components/ui/Loading";
import { CustomerList } from "@/src/schema/SchemaContact";

export default function ContactListView() {
  const [clients, setClients] = useState<CustomerList>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const result = await ListCustomer();

      if (result.data) {
        setClients(result.data);
        setError(null);
      } else {
        setError("Error al cargar clientes");
        console.log("Error:", result?.error);
      }
    } catch (error) {
      setError("Error al conectar con el servidor" + error);
    } finally {
      setLoading(false);
    }
  }, []);

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

  if (loading) return <Loading> Cargando clientes...</Loading>;
  if (error)
    return (
      <div className="flex justify-center items-center min-h-[200px] text-red-500">
        Error: {error}
      </div>
    );

  return (
    <ProtectedRoute allowedRoles={[1, 2]}>
      <Heading> Clientes </Heading>
      <div className="p-4 md:p-8">
        <div className="flex justify-end mb-4">
          <Button
            color="primary"
            onPress={() => router.push("/Dashboard/Contact/Customer/New")}
          >
            <Icon
              className="md:mr-2"
              height="20"
              icon="heroicons:plus"
              width="20"
            />
            <span className="hidden md:inline">Registrar Cliente</span>
          </Button>
        </div>
        <div className="space-y-3">
          <CardMobileCustomer
            handleDeleteSuccess={handleDeleteSuccess}
            items={items}
          />
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
