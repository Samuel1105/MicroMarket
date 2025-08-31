"use client"
import { ListCategory } from "@/actions/products/list-categoty-action";
import { ListSuppliers } from "@/actions/proveedores/list-supplier-action";
import { SupplierList } from "@/src/schema/SchemaContact";
import { CategoryList, ProductoCompleteForm } from "@/src/schema/SchemaProduts";
import { Input, Select, SelectItem, Textarea, Chip } from "@heroui/react"
import { useCallback, useEffect, useState } from "react";
import { useFormContext, Controller } from "react-hook-form";

export default function ProductFormBasic() {
    const [categories, setCategories] = useState<CategoryList>([]);
    const [proveedores, setProveedores] = useState<SupplierList>([]);
    const [loading, setLoading] = useState({
        categories: true,
        suppliers: true
    });

    const { 
        register, 
        control, 
        formState: { errors },
        watch 
    } = useFormContext<ProductoCompleteForm>();

    // Watch para mostrar preview
    const watchedData = watch(['nombre', 'descripcion']);

    const fetchCategory = useCallback(async () => {
        try {
            setLoading(prev => ({ ...prev, categories: true }));
            const result = await ListCategory();
            if (result.data) {
                setCategories(result.data);
            } else {
                console.error('Error al cargar categorías:', result.error);
            }
        } catch (error) {
            console.error("Error al conectar con el servidor:", error);
        } finally {
            setLoading(prev => ({ ...prev, categories: false }));
        }
    }, []);

    const fecthProveedores = useCallback(async () => {
        try {
            setLoading(prev => ({ ...prev, suppliers: true }));
            const result = await ListSuppliers();
            if (result.data) {
                setProveedores(result.data);
            } else {
                console.error('Error al cargar proveedores:', result.error);
            }
        } catch (error) {
            console.error("Error al conectar con el servidor:", error);
        } finally {
            setLoading(prev => ({ ...prev, suppliers: false }));
        }
    }, []);

    useEffect(() => {
        fetchCategory();
        fecthProveedores();
    }, [fetchCategory, fecthProveedores]);

    return (
        <div className="space-y-6">
            {/* Nombre del producto */}
            <div>
                <Input
                    {...register('nombre')}
                    label="Nombre del producto"
                    placeholder="Ej: Coca Cola 500ml"
                    isRequired
                    variant="bordered"
                    size="lg"
                    isInvalid={!!errors.nombre}
                    errorMessage={errors.nombre?.message}
                    startContent={
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    }
                />
                {watchedData[0] && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-md">
                        <p className="text-xs text-blue-600">
                            <strong>Vista previa:</strong> {watchedData[0]}
                        </p>
                    </div>
                )}
            </div>

            {/* Descripción */}
            <div>
                <Textarea
                    {...register('descripcion')}
                    label="Descripción"
                    placeholder="Descripción detallada del producto..."
                    variant="bordered"
                    minRows={3}
                    maxRows={5}
                />
                {watchedData[1] && (
                    <p className="mt-1 text-xs text-gray-500">
                        {watchedData[1].length} caracteres
                    </p>
                )}
            </div>

            {/* Categoría */}
            <div>
                <Controller
                    name="categoriaID"
                    control={control}
                    render={({ field }) => (
                        <Select
                            {...field}
                            label="Categoría"
                            placeholder="Seleccionar categoría"
                            isRequired
                            variant="bordered"
                            size="lg"
                            isLoading={loading.categories}
                            isInvalid={!!errors.categoriaID}
                            errorMessage={errors.categoriaID?.message}
                            startContent={
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            }
                        >
                            {categories.map((category) => (
                                <SelectItem key={category.id} >
                                    {category.nombre}
                                </SelectItem>
                            ))}
                        </Select>
                    )}
                />
            </div>

            {/* Proveedor */}
            <div>
                <Controller
                    name="proveedorID"
                    control={control}
                    render={({ field }) => (
                        <Select
                            {...field}
                            label="Proveedor"
                            placeholder="Seleccionar proveedor"
                            isRequired
                            variant="bordered"
                            size="lg"
                            isLoading={loading.suppliers}
                            isInvalid={!!errors.proveedorID}
                            errorMessage={errors.proveedorID?.message}
                            startContent={
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            }
                        >
                            {proveedores.map((proveedor) => (
                                <SelectItem key={proveedor.id} >
                                    {proveedor.nombre}
                                </SelectItem>
                            ))}
                        </Select>
                    )}
                />
            </div>

            {/* Requiere número de serie */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Controller
                    name="requiereNumeroSerie"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="requiereNumeroSerie"
                                checked={value || false}
                                onChange={(e) => onChange(e.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div>
                                <label htmlFor="requiereNumeroSerie" className="text-sm font-medium text-gray-700">
                                    Requiere número de serie
                                </label>
                                <p className="text-xs text-gray-500 mt-1">
                                    Marca esta opción si el producto necesita seguimiento individual por número de serie
                                </p>
                                {value && (
                                    <Chip color="warning" size="sm" className="mt-2">
                                        ⚠️ Control de serie activado
                                    </Chip>
                                )}
                            </div>
                        </div>
                    )}
                />
            </div>
        </div>
    )
}