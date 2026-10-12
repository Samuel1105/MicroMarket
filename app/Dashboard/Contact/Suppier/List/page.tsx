"use client";
import {
  Button,
  Pagination,
} from "@heroui/react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { ListSuppliers } from "@/actions/proveedores/list-supplier-action";
import CardMobileSuppplier from "@/components/contact/CardMobileSupplier";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Heading from "@/components/ui/Heading";
import Loading from "@/components/ui/Loading";
import { SupplierList } from "@/src/schema/SchemaContact";

export default function SupplierListView() {
  const [suppliers, setSupplers] = useState<SupplierList>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await ListSuppliers();

      if (result.data) {
        setSupplers(result.data);
        setError(null);
      } else {
        setError(result.error);
        console.log("Error:", result?.error);
      }
    } catch (error) {
      setError("Error al conectar con el servidor" + error);
    } finally {
      setLoading(false);
    }
  }, []);

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

  if (loading) return <Loading> Cargando proveedores...</Loading>;
  if (error)
    return (
      <div className="flex justify-center items-center min-h-[200px] text-red-500">
        Error: {error}
      </div>
    );

  return (
    <ProtectedRoute allowedRoles={[1, 3, 5]}>
      <Heading> Proveedores </Heading>
      <div className="p-4 md:p-8">
        <div className="flex justify-end mb-4">
          <Button
            color="primary"
            onPress={() => router.push("/Dashboard/Contact/Suppier/New")}
          >
            <Icon
              className="md:mr-2"
              height="20"
              icon="heroicons:plus"
              width="20"
            />
            <span className="hidden md:inline">Registrar Proveedor</span>
          </Button>
        </div>

        <div className="space-y-3">
          <CardMobileSuppplier
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
