"use client";
import { Input, Select, SelectItem, Textarea } from "@heroui/react";
import { useCallback, useEffect, useState } from "react";
import { useFormContext, Controller } from "react-hook-form";

import { ListCategory } from "@/actions/products/list-categoty-action";
import { ListSuppliers } from "@/actions/proveedores/list-supplier-action";
import { SupplierList } from "@/src/schema/SchemaContact";
import { CategoryList, ProductoCompleto } from "@/src/schema/SchemaProduts";

interface ProductFormBasicProps {
  producto?: ProductoCompleto;
}

export default function ProductFormBasic(_props: ProductFormBasicProps) {
  const [categories, setCategories] = useState<CategoryList>([]);
  const [proveedores, setProveedores] = useState<SupplierList>([]);
  const [loading, setLoading] = useState({
    categories: true,
    suppliers: true,
  });

  const {
    register,
    control,
    formState: { errors },
  } = useFormContext();

  const fetchCategory = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, categories: true }));
      const result = await ListCategory();

      if (result.data) {
        setCategories(result.data);
      } else {
        console.error("Error al cargar categorías:", result.error);
      }
    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
    } finally {
      setLoading((prev) => ({ ...prev, categories: false }));
    }
  }, []);

  const fecthProveedores = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, suppliers: true }));
      const result = await ListSuppliers();

      if (result.data) {
        setProveedores(result.data);
      } else {
        console.error("Error al cargar proveedores:", result.error);
      }
    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
    } finally {
      setLoading((prev) => ({ ...prev, suppliers: false }));
    }
  }, []);

  useEffect(() => {
    fetchCategory();
    fecthProveedores();
  }, [fetchCategory, fecthProveedores]);

  return (
    <div className="space-y-8 pt-2">
      <Input
        {...register("nombre")}
        isRequired
        isInvalid={!!errors.nombre}
        label="Nombre del producto"
        labelPlacement="outside"
        placeholder="Ej: Coca Cola 500ml"
        variant="bordered"
      />

      <Textarea
        {...register("descripcion")}
        label="Descripción"
        labelPlacement="outside"
        maxRows={4}
        minRows={2}
        placeholder="Detalle breve (marca, tamaño, sabor…)"
        variant="bordered"
      />

      <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Controller
          control={control}
          name="categoriaID"
          render={({ field }) => (
            <Select
              {...field}
              isRequired
              isInvalid={!!errors.categoriaID}
              isLoading={loading.categories}
              label="Categoría"
              labelPlacement="outside"
              placeholder="Seleccionar"
              selectedKeys={field.value ? [String(field.value)] : []}
              variant="bordered"
            >
              {categories.map((category) => (
                <SelectItem key={category.id}>{category.nombre}</SelectItem>
              ))}
            </Select>
          )}
        />

        <Controller
          control={control}
          name="proveedorID"
          render={({ field }) => (
            <Select
              {...field}
              isRequired
              isInvalid={!!errors.proveedorID}
              isLoading={loading.suppliers}
              label="Proveedor"
              labelPlacement="outside"
              placeholder="Seleccionar"
              selectedKeys={field.value ? [String(field.value)] : []}
              variant="bordered"
            >
              {proveedores.map((proveedor) => (
                <SelectItem key={proveedor.id}>{proveedor.nombre}</SelectItem>
              ))}
            </Select>
          )}
        />
      </div>

      <Input
        {...register("stockMinimo", { valueAsNumber: true })}
        description="Si el stock total (almacén + estante) baja de esta cantidad, el sistema avisa que hay que comprar. Se mide en la unidad base."
        errorMessage={errors.stockMinimo?.message as string | undefined}
        isInvalid={!!errors.stockMinimo}
        label="Stock mínimo"
        labelPlacement="outside"
        min={0}
        placeholder="0"
        step="any"
        type="number"
        variant="bordered"
      />
    </div>
  );
}
