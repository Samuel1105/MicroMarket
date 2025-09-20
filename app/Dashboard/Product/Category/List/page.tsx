"use client";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { Button, Pagination } from "@heroui/react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useRouter } from "next/navigation";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import Heading from "@/components/ui/Heading";
import { ListCategory } from "@/actions/products/list-categoty-action";
import { CategoryList } from "@/src/schema/SchemaProduts"; // Asegúrate que esta es la ruta correcta
import Loading from "@/components/ui/Loading";
import CategoryCard from "@/components/product/CategoryCard";

export default function ProductCategoryListView() {
  const [categories, setCategories] = useState<CategoryList>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // --- Lógica de Paginación ---
  const [page, setPage] = useState(1);
  const rowsPerPage = 12; // Número de tarjetas por página
  const pages = Math.ceil(categories.length / rowsPerPage);

  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    return categories.slice(start, end);
  }, [page, categories, rowsPerPage]);

  const fetchCategory = useCallback(async () => {
    try {
      setLoading(true);
      const result = await ListCategory();

      if (result.data) {
        setCategories(result.data);
        setError(null);
      } else {
        setError(result.error || "Error al cargar los datos.");
        console.error(result.error);
      }
    } catch (error) {
      setError("Error al conectar con el servidor." + error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategory();
  }, [fetchCategory]);

  const handleDeleteSuccess = useCallback(() => {
    fetchCategory();
  }, [fetchCategory]);

  if (loading) return <Loading>Cargando categorías...</Loading>;
  if (error)
    return (
      <div className="flex justify-center items-center min-h-[200px] text-red-500">
        Error: {error}
      </div>
    );

  return (
    <ProtectedRoute allowedRoles={[1, 3]}>
      <Heading>Categorías</Heading>
      <div className="p-4 md:p-8">
        <div className="flex justify-end items-center mb-6">
          <Button
            color="primary"
            onPress={() => router.push("/Dashboard/Product/Category/New")}
          >
            <Icon
              className="md:mr-2"
              height="20"
              icon="heroicons:plus"
              width="20"
            />
            <span className="hidden md:inline">Registrar Categoría</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items && items.length > 0 ? (
            <CategoryCard
              categories={items}
              onDeleteSuccess={handleDeleteSuccess}
            />
          ) : (
            <div className="col-span-full text-center py-10">
              <h1 className="text-xl text-default-500">
                No hay categorías disponibles
              </h1>
            </div>
          )}
        </div>

        {/* Componente de paginación */}
        {pages > 1 && (
          <div className="flex justify-center mt-8">
            <Pagination
              isCompact
              showControls
              showShadow
              color="primary"
              page={page}
              total={pages}
              onChange={setPage}
            />
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
