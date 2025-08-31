"use client"
import { createUnidadMedida, unidadMedidaList } from '@/actions/products/list-productInfo-action';
import { UnidadMedidaList, ProductoCompleteForm } from '@/src/schema/SchemaProduts';
import { Button, Input, Select, SelectItem, Card, CardBody } from '@heroui/react'
import React, { useCallback, useEffect, useState } from 'react'
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import NuevaUnidadModal from './NuevaUnidadModal';
import { toast } from 'react-toastify';


export default function ProductFormUnidades() {
    const [unidades, setUnidades] = useState<UnidadMedidaList>([]);
    const [loading, setLoading] = useState(true);
    const [mostrarModal, setMostrarModal] = useState(false);

    const {
        control,
        watch,
        formState: { errors },
    } = useFormContext<ProductoCompleteForm>();

    const { fields, append, remove } = useFieldArray({
        control,
        name: "conversiones"
    });

    const watchedConversiones = watch("conversiones");
    const unidadBase = watchedConversiones?.[0]?.unidadOrigenID;

    const fetchUnidades = useCallback(async () => {
        try {
            setLoading(true);
            const result = await unidadMedidaList();
            if (result.data) {
                setUnidades(result.data);
            } else {
                console.error('Error al cargar unidades:', result.error);
            }
        } catch (error) {
            console.error("Error al conectar con el servidor:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUnidades();
    }, [fetchUnidades]);

    const agregarConversion = () => {
        append({
            unidadOrigenID: '',
            factorConversion: 1,
            precioVentaUnitario: 0,
            esUnidadBase: false
        });
    };

    const eliminarConversion = (index: number) => {
        if (fields.length > 1) {
            remove(index);
        }
    };

    const handleNuevaUnidad = async (nuevaUnidad: { nombre: string; abreviatura: string }) => {
        try {
            const result = await createUnidadMedida(nuevaUnidad)

            if (result.success) {
                await fetchUnidades()
                toast.success(result.message)
                return;
            }

            console.error(result.error)

        } catch (error) {
            console.error(error)
        } finally {
            setMostrarModal(false)
        }
    };

    const getUnidadNombre = (id: string) => {
        const unidad = unidades.find(u => u.id.toString() === id);
        return unidad ? unidad.nombre : 'Unidad';
    };

    const calcularEquivalencia = (index: number) => {
        const conversion = watchedConversiones[index];
        if (index === 0 || !conversion || !unidadBase) return null;

        const unidadOrigen = getUnidadNombre(conversion.unidadOrigenID);
        const unidadBaseNombre = getUnidadNombre(unidadBase);

        return `1 ${unidadOrigen} = ${conversion.factorConversion} ${unidadBaseNombre.toLowerCase()}${conversion.factorConversion > 1 ? 's' : ''}`;
    };

    return (
        <div className="space-y-6">

            {/* Lista de conversiones */}
            <div className="space-y-4">
                {fields.map((field, index) => (
                    <Card key={field.id} className={`${index === 0 ? 'ring-2 ring-green-200' : ''}`}>
                        <CardBody className="p-6">
                            {/* Header de la conversión */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${index === 0
                                            ? 'bg-green-100 text-green-600'
                                            : 'bg-blue-100 text-blue-600'
                                        }`}>
                                        {index === 0 ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                            </svg>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">
                                            {index === 0 ? 'Unidad Base' : `Unidad de Venta ${index + 1}`}
                                        </h4>
                                        {index === 0 && (
                                            <p className="text-xs text-green-600">Esta será tu unidad de medida principal</p>
                                        )}
                                    </div>
                                </div>

                                {index > 0 && (
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        color="danger"
                                        variant="light"
                                        onPress={() => eliminarConversion(index)}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </Button>
                                )}
                            </div>

                            {/* Campos del formulario */}
                            <div className="w-full space-y-4">
                                {/* Selector de unidad */}
                                <div className="md:col-span-1">
                                    <Controller
                                        name={`conversiones.${index}.unidadOrigenID`}
                                        control={control}
                                        render={({ field }) => (
                                            <div className="flex gap-2">
                                                <Select
                                                    {...field}
                                                    label="Unidad de Medida"
                                                    placeholder="Seleccionar"
                                                    isRequired
                                                    variant="bordered"
                                                    isLoading={loading}
                                                    isInvalid={!!errors.conversiones?.[index]?.unidadOrigenID}
                                                    errorMessage={errors.conversiones?.[index]?.unidadOrigenID?.message}
                                                    className="flex-1 w-full"
                                                >
                                                    {unidades.map((unidad) => (
                                                        <SelectItem key={unidad.id} >
                                                            {`${unidad.nombre} (${unidad.abreviatura})`}
                                                        </SelectItem>
                                                    ))}
                                                </Select>

                                                <Button
                                                    isIconOnly
                                                    color="success"
                                                    variant="bordered"
                                                    onPress={() => setMostrarModal(true)}
                                                    title="Crear nueva unidad"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                </Button>
                                            </div>
                                        )}
                                    />
                                </div>

                                {/* Factor de conversión */}
                                {index > 0 && (
                                    <div>
                                        <Controller
                                            name={`conversiones.${index}.factorConversion`}
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    {...field}
                                                    type="number"
                                                    label="Factor de Conversión"
                                                    placeholder="1.00"
                                                    step="0.01"
                                                    min="0.01"
                                                    isRequired
                                                    variant="bordered"
                                                    value={field.value?.toString() || ''}
                                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                                                    isInvalid={!!errors.conversiones?.[index]?.factorConversion}
                                                    errorMessage={errors.conversiones?.[index]?.factorConversion?.message}
                                                    description="¿Cuántas unidades base contiene?"
                                                />
                                            )}
                                        />
                                    </div>
                                )}

                                {/* Precio de venta */}
                                <div>
                                    <Controller
                                        name={`conversiones.${index}.precioVentaUnitario`}
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                {...field}
                                                type="number"
                                                label="Precio de Venta"
                                                placeholder="0.00"
                                                step="0.01"
                                                min="0"
                                                isRequired
                                                variant="bordered"
                                                value={field.value?.toString() || ''}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                isInvalid={!!errors.conversiones?.[index]?.precioVentaUnitario}
                                                errorMessage={errors.conversiones?.[index]?.precioVentaUnitario?.message}
                                                startContent={
                                                    <span className="text-gray-500 text-sm">Bs.</span>
                                                }
                                            />
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Mostrar equivalencia */}
                            {index > 0 && calcularEquivalencia(index) && (
                                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-sm text-yellow-800">
                                            <strong>Equivalencia:</strong> {calcularEquivalencia(index)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                ))}
            </div>

            {/* Botón para agregar nueva conversión */}
            <Button
                onPress={agregarConversion}
                color="primary"
                variant="bordered"
                className="w-full h-16 text-base font-medium border-2 border-dashed"
                startContent={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                }
            >
                Agregar otra unidad de venta
            </Button>


            {/* Modal para nueva unidad */}
            <NuevaUnidadModal
                isOpen={mostrarModal}
                onClose={() => setMostrarModal(false)}
                onSave={handleNuevaUnidad}
            />
        </div>
    )
}