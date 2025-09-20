"use client";
import {
  Button,
  Link,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { ListProduct } from "@/actions/products/list-productInfo-action";
import CardMobileProduct from "@/components/product/CardMobileProduct";
import DeleteProductConfirm from "@/components/product/DeleteProductConfirm";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Heading from "@/components/ui/Heading";
import Loading from "@/components/ui/Loading";
import { ProductListType } from "@/src/schema/SchemaProduts";

export default function ListProductView() {
  const [productos, setProducts] = useState<ProductListType>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const result = await ListProduct();

      if (result.data) {
        setProducts(result.data);
        console.log(result.data);
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

  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  const pages = Math.ceil(productos.length / rowsPerPage);
  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    return productos.slice(start, end);
  }, [page, productos]);

  if (loading) return <Loading> Cargando clientes...</Loading>;
  if (error)
    return (
      <div className="flex justify-center items-center min-h-[200px] text-red-500">
        Error: {error}
      </div>
    );

  return (
    <ProtectedRoute allowedRoles={[1, 3, 4]}>
      <Heading> Lista de Productos </Heading>
      <div className="p-4 md:p-8">
        <div className="flex justify-end mb-4">
          <Button
            color="primary"
            onPress={() => router.push("/Dashboard/Product/New")}
          >
            <Icon
              className="md:mr-2"
              height="20"
              icon="heroicons:plus"
              width="20"
            />
            <span className="hidden md:inline">Registrar Producto</span>
          </Button>
        </div>
        <div className="hidden md:block">
          <Table
            aria-label="Lista de Clientes"
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
              <TableColumn key="nombre">Nombre</TableColumn>
              <TableColumn key="categoria">Categoria</TableColumn>
              <TableColumn key="proveedor">Proveedor</TableColumn>
              <TableColumn key="unidad">Unidad Medida</TableColumn>
              <TableColumn key="acciones" className="text-center">
                Acciones
              </TableColumn>
            </TableHeader>
            <TableBody items={items}>
              {(item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.nombre}</TableCell>
                  <TableCell>{item.Categoria.nombre}</TableCell>
                  <TableCell>{item.Proveedor.nombre}</TableCell>
                  <TableCell>{String(item.UnidadMedida.abreviatura)}</TableCell>
                  <TableCell>
                    <div className="flex gap-4 justify-center">
                      <Link
                        className="transition-transform hover:scale-110"
                        href={`/Dashboard/Product/${item.id}/Edit`}
                      >
                        <Icon
                          color="#0007fc"
                          height="24"
                          icon="iconamoon:edit-thin"
                          width="24"
                        />
                      </Link>
                      <DeleteProductConfirm
                        producto={item}
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
          <CardMobileProduct
            handleDeleteSuccess={handleDeleteSuccess}
            items={items}
          />

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
