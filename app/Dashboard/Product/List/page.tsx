"use client";
import { Card, CardBody, Pagination, Select, SelectItem } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { ListProduct } from "@/actions/products/list-productInfo-action";
import CardMobileProduct from "@/components/product/CardMobileProduct";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import ListHeaderCard from "@/components/ui/ListHeaderCard";
import Loading from "@/components/ui/Loading";
import { ProductListType } from "@/src/schema/SchemaProduts";

const STOCK_BAJO = 10;

export default function ListProductView() {
  const [productos, setProducts] = useState<ProductListType>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("todos");
  const [categoria, setCategoria] = useState("todas");
  const [stock, setStock] = useState("todos");

  const router = useRouter();

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const result = await ListProduct();

      if (result.data) {
        setProducts(result.data);
        setError(null);
      } else {
        setError("Error al cargar los productos");
        console.error("Error", result.error);
      }
    } catch (error) {
      setError("Error al conectar con el servidor" + error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDeleteSuccess = useCallback(() => {
    fetchProducts();
  }, [fetchProducts]);

  const categorias = useMemo(
    () => Array.from(new Set(productos.map((p) => p.Categoria.nombre))).sort(),
    [productos],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return productos.filter((p) => {
      const cantidad = p.stockTotal ?? 0;

      if (
        q &&
        !p.nombre.toLowerCase().includes(q) &&
        !p.Categoria.nombre.toLowerCase().includes(q) &&
        !p.Proveedor.nombre.toLowerCase().includes(q)
      )
        return false;
      if (estado === "activo" && p.estado !== 1) return false;
      if (estado === "inactivo" && p.estado === 1) return false;
      if (categoria !== "todas" && p.Categoria.nombre !== categoria) return false;
      if (stock === "sin" && cantidad !== 0) return false;
      if (stock === "bajo" && !(cantidad > 0 && cantidad <= STOCK_BAJO)) return false;
      if (stock === "ok" && cantidad <= STOCK_BAJO) return false;

      return true;
    });
  }, [productos, search, estado, categoria, stock]);

  const activeFilters =
    (estado !== "todos" ? 1 : 0) +
    (categoria !== "todas" ? 1 : 0) +
    (stock !== "todos" ? 1 : 0);

  const clearFilters = () => {
    setSearch("");
    setEstado("todos");
    setCategoria("todas");
    setStock("todos");
  };

  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    setPage(1);
  }, [search, estado, categoria, stock]);

  const pages = Math.ceil(filtered.length / rowsPerPage);
  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;

    return filtered.slice(start, start + rowsPerPage);
  }, [page, filtered]);

  if (loading) return <Loading> Cargando productos...</Loading>;
  if (error)
    return (
      <div className="flex justify-center items-center min-h-[200px] text-red-500">
        Error: {error}
      </div>
    );

  const pick = (setter: (v: string) => void, fallback: string) => (keys: any) =>
    setter((Array.from(keys)[0] as string) || fallback);

  return (
    <ProtectedRoute allowedRoles={[1, 3]}>
      <div className="p-4 md:p-8 space-y-5">
        <Breadcrumbs items={[{ label: "Productos" }, { label: "Lista" }]} />

        <ListHeaderCard
          actionLabel="Registrar Producto"
          activeFilters={activeFilters}
          description="Administra el catálogo de productos"
          filters={
            <>
              <Select
                disallowEmptySelection
                label="Estado"
                selectedKeys={[estado]}
                onSelectionChange={pick(setEstado, "todos")}
              >
                <SelectItem key="todos">Todos</SelectItem>
                <SelectItem key="activo">Activos</SelectItem>
                <SelectItem key="inactivo">Inactivos</SelectItem>
              </Select>
              <Select
                disallowEmptySelection
                label="Categoría"
                selectedKeys={[categoria]}
                onSelectionChange={pick(setCategoria, "todas")}
              >
                {[
                  <SelectItem key="todas">Todas</SelectItem>,
                  ...categorias.map((c) => <SelectItem key={c}>{c}</SelectItem>),
                ]}
              </Select>
              <Select
                disallowEmptySelection
                label="Stock"
                selectedKeys={[stock]}
                onSelectionChange={pick(setStock, "todos")}
              >
                <SelectItem key="todos">Todos</SelectItem>
                <SelectItem key="ok">Con stock</SelectItem>
                <SelectItem key="bajo">Stock bajo</SelectItem>
                <SelectItem key="sin">Sin stock</SelectItem>
              </Select>
            </>
          }
          search={search}
          searchPlaceholder="Buscar por nombre, categoría o proveedor..."
          title="Productos"
          onAction={() => router.push("/Dashboard/Product/New")}
          onClearFilters={clearFilters}
          onSearchChange={setSearch}
        />

        <p className="text-sm text-gray-500 px-1">
          {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
          {filtered.length !== productos.length && ` de ${productos.length}`}
        </p>

        {filtered.length === 0 ? (
          <Card className="border border-default-200 shadow-sm">
            <CardBody className="p-10 text-center">
              <Icon
                className="mx-auto text-gray-300 mb-3"
                height="56"
                icon="heroicons:cube"
                width="56"
              />
              <h3 className="text-lg font-semibold text-gray-700 mb-1">
                No se encontraron productos
              </h3>
              <p className="text-gray-500 text-sm">
                Prueba con otra búsqueda o limpia los filtros.
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            <CardMobileProduct
              handleDeleteSuccess={handleDeleteSuccess}
              items={items}
            />
          </div>
        )}

        {pages > 1 && (
          <div className="flex justify-center pt-2">
            <Pagination
              isCompact
              showControls
              showShadow
              color="secondary"
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
