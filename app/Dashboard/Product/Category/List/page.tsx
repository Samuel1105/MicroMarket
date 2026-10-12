"use client";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { Card, CardBody, Pagination, Select, SelectItem } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import ListHeaderCard from "@/components/ui/ListHeaderCard";
import { ListCategory } from "@/actions/products/list-categoty-action";
import { CategoryList } from "@/src/schema/SchemaProduts";
import Loading from "@/components/ui/Loading";
import CategoryCard from "@/components/product/CategoryCard";

export default function ProductCategoryListView() {
  const [categories, setCategories] = useState<CategoryList>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [conProductos, setConProductos] = useState("todas");
  const router = useRouter();

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return categories.filter((c) => {
      if (q && !c.nombre.toLowerCase().includes(q)) return false;
      if (conProductos === "con" && c.cantidadProductos === 0) return false;
      if (conProductos === "sin" && c.cantidadProductos > 0) return false;

      return true;
    });
  }, [categories, search, conProductos]);

  const [page, setPage] = useState(1);
  const rowsPerPage = 12;

  useEffect(() => {
    setPage(1);
  }, [search, conProductos]);

  const pages = Math.ceil(filtered.length / rowsPerPage);
  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;

    return filtered.slice(start, start + rowsPerPage);
  }, [page, filtered]);

  if (loading) return <Loading>Cargando categorías...</Loading>;
  if (error)
    return (
      <div className="flex justify-center items-center min-h-[200px] text-red-500">
        Error: {error}
      </div>
    );

  return (
    <ProtectedRoute allowedRoles={[1, 3]}>
      <div className="p-4 md:p-8 space-y-5">
        <Breadcrumbs items={[{ label: "Productos" }, { label: "Categorías" }]} />

        <ListHeaderCard
          actionLabel="Registrar Categoría"
          activeFilters={conProductos !== "todas" ? 1 : 0}
          description="Organiza tus productos por categoría"
          filters={
            <Select
              disallowEmptySelection
              label="Productos"
              selectedKeys={[conProductos]}
              onSelectionChange={(keys) =>
                setConProductos((Array.from(keys)[0] as string) || "todas")
              }
            >
              <SelectItem key="todas">Todas</SelectItem>
              <SelectItem key="con">Con productos</SelectItem>
              <SelectItem key="sin">Sin productos</SelectItem>
            </Select>
          }
          search={search}
          searchPlaceholder="Buscar categoría..."
          title="Categorías"
          onAction={() => router.push("/Dashboard/Product/Category/New")}
          onClearFilters={() => {
            setSearch("");
            setConProductos("todas");
          }}
          onSearchChange={setSearch}
        />

        <p className="text-sm text-gray-500 px-1">
          {filtered.length} {filtered.length === 1 ? "categoría" : "categorías"}
          {filtered.length !== categories.length && ` de ${categories.length}`}
        </p>

        {items.length > 0 ? (
          <div className="space-y-3">
            <CategoryCard categories={items} onDeleteSuccess={handleDeleteSuccess} />
          </div>
        ) : (
          <Card className="border border-default-200 shadow-sm">
            <CardBody className="p-10 text-center">
              <Icon
                className="mx-auto text-gray-300 mb-3"
                height="56"
                icon="heroicons:tag"
                width="56"
              />
              <h3 className="text-lg font-semibold text-gray-700 mb-1">
                No se encontraron categorías
              </h3>
              <p className="text-gray-500 text-sm">
                Prueba con otra búsqueda o limpia los filtros.
              </p>
            </CardBody>
          </Card>
        )}

        {pages > 1 && (
          <div className="flex justify-center pt-2">
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
