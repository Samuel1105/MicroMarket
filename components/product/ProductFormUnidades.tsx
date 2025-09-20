"use client";
import {
  Button,
  Input,
  Select,
  SelectItem,
  Card,
  CardBody,
  Chip,
} from "@heroui/react";
import React, { useCallback, useEffect, useState } from "react";
import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { toast } from "react-toastify";

import NuevaUnidadModal from "./NuevaUnidadModal";

import { UnidadMedidaList, ProductoCompleto } from "@/src/schema/SchemaProduts";
import {
  createUnidadMedida,
  unidadMedidaList,
} from "@/actions/products/list-productInfo-action";

interface ProductFormUnidadesProps {
  producto?: ProductoCompleto;
}

export default function ProductFormUnidades({
  producto,
}: ProductFormUnidadesProps) {
  const [unidades, setUnidades] = useState<UnidadMedidaList>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const isEditMode = !!producto;

  const {
    control,
    watch,
    formState: {},
  } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "conversiones",
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
        console.error("Error al cargar unidades:", result.error);
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
      unidadOrigenID: "",
      factorConversion: 1,
      precioVentaUnitario: 0,
      esUnidadBase: false,
      estado: 1,
    });
  };

  const eliminarConversion = (index: number) => {
    if (fields.length > 1) {
      // Si estamos en modo edición y la conversión tiene ID, marcarla como eliminada
      if (isEditMode && watchedConversiones[index]?.id) {
        //const conversionActual = watchedConversiones[index];
        // Cambiar el estado a 0 para marcar como eliminada
        // En lugar de remove, podemos usar setValue para cambiar el estado
        remove(index); // Por simplicidad, removemos del array y manejaremos las eliminadas en el hook
      } else {
        remove(index);
      }
    }
  };

  const handleNuevaUnidad = async (nuevaUnidad: {
    nombre: string;
    abreviatura: string;
  }) => {
    try {
      const result = await createUnidadMedida(nuevaUnidad);

      if (result.success) {
        await fetchUnidades();
        toast.success(result.message);

        return;
      }

      console.error(result.error);
    } catch (error) {
      console.error(error);
    } finally {
      setMostrarModal(false);
    }
  };

  const getUnidadNombre = (id: string) => {
    const unidad = unidades.find((u) => u.id.toString() === id);

    return unidad ? unidad.nombre : "Unidad";
  };

  const calcularEquivalencia = (index: number) => {
    const conversion = watchedConversiones[index];

    if (index === 0 || !conversion || !unidadBase) return null;

    const unidadOrigen = getUnidadNombre(conversion.unidadOrigenID);
    const unidadBaseNombre = getUnidadNombre(unidadBase);

    return `1 ${unidadOrigen} = ${conversion.factorConversion} ${unidadBaseNombre.toLowerCase()}${conversion.factorConversion > 1 ? "s" : ""}`;
  };

  return (
    <div className="space-y-6">
      {/* Información de edición */}
      {isEditMode && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            <div>
              <span className="text-sm font-medium text-amber-800">
                Editando unidades existentes
              </span>
              <p className="text-xs text-amber-600 mt-1">
                Puedes modificar precios, agregar nuevas unidades o eliminar
                existentes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de conversiones */}
      <div className="space-y-4">
        {fields.map((field, index) => {
          const isExistingConversion =
            isEditMode && watchedConversiones[index]?.id;

          return (
            <Card
              key={field.id}
              className={`${index === 0 ? "ring-2 ring-green-200" : ""}`}
            >
              <CardBody className="p-6">
                {/* Header de la conversión */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        index === 0
                          ? "bg-green-100 text-green-600"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {index === 0 ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                          />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        {index === 0
                          ? "Unidad Base"
                          : `Unidad de Venta ${index + 1}`}
                        {isExistingConversion && (
                          <Chip color="primary" size="sm" variant="flat">
                            Existente
                          </Chip>
                        )}
                        {!isExistingConversion && index > 0 && (
                          <Chip color="success" size="sm" variant="flat">
                            Nueva
                          </Chip>
                        )}
                      </h4>
                      {index === 0 && (
                        <p className="text-xs text-green-600">
                          Esta será tu unidad de medida principal
                        </p>
                      )}
                    </div>
                  </div>

                  {index > 0 && (
                    <Button
                      isIconOnly
                      color="danger"
                      size="sm"
                      variant="light"
                      onPress={() => eliminarConversion(index)}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M6 18L18 6M6 6l12 12"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                    </Button>
                  )}
                </div>

                {/* Campos del formulario */}
                <div className="w-full space-y-4">
                  {/* Hidden field para ID si existe */}
                  {isExistingConversion && (
                    <Controller
                      control={control}
                      name={`conversiones.${index}.id`}
                      render={({ field }) => <input type="hidden" {...field} />}
                    />
                  )}

                  {/* Selector de unidad */}
                  <div className="md:col-span-1">
                    <Controller
                      control={control}
                      name={`conversiones.${index}.unidadOrigenID`}
                      render={({ field }) => (
                        <div className="flex gap-2">
                          <Select
                            {...field}
                            isRequired
                            className="flex-1 w-full"
                            isLoading={loading}
                            label="Unidad de Medida"
                            placeholder="Seleccionar"
                            selectedKeys={field.value}
                            //isInvalid={!!errors.conversiones?.[index]?.unidadOrigenID}
                            //errorMessage={errors.conversiones?.[index]?.unidadOrigenID?.message}
                            variant="bordered"
                          >
                            {unidades.map((unidad) => (
                              <SelectItem key={unidad.id}>
                                {`${unidad.nombre} (${unidad.abreviatura})`}
                              </SelectItem>
                            ))}
                          </Select>

                          <Button
                            isIconOnly
                            color="success"
                            title="Crear nueva unidad"
                            variant="bordered"
                            onPress={() => setMostrarModal(true)}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                d="M12 4v16m8-8H4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                              />
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
                        control={control}
                        name={`conversiones.${index}.factorConversion`}
                        render={({ field }) => (
                          <Input
                            {...field}
                            isRequired
                            description="¿Cuántas unidades base contiene?"
                            label="Factor de Conversión"
                            min="0.01"
                            placeholder="1.00"
                            step="0.01"
                            type="number"
                            value={field.value?.toString() || ""}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 1)
                            }
                            //isInvalid={!!errors.conversiones?.[index]?.factorConversion}
                            //errorMessage={errors.conversiones?.[index]?.factorConversion?.message}
                            variant="bordered"
                          />
                        )}
                      />
                    </div>
                  )}

                  {/* Precio de venta */}
                  <div>
                    <Controller
                      control={control}
                      name={`conversiones.${index}.precioVentaUnitario`}
                      render={({ field }) => (
                        <Input
                          {...field}
                          isRequired
                          description={
                            isExistingConversion
                              ? "Puedes actualizar el precio"
                              : "Precio para esta unidad"
                          }
                          label="Precio de Venta"
                          min="0"
                          placeholder="0.00"
                          startContent={
                            <span className="text-gray-500 text-sm">Bs.</span>
                          }
                          step="0.01"
                          type="number"
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                          //isInvalid={!!errors.conversiones?.[index]?.precioVentaUnitario}
                          //={errors.conversiones?.[index]?.precioVentaUnitario?.message}
                          value={field.value?.toString() || ""}
                          variant="bordered"
                        />
                      )}
                    />
                  </div>
                </div>

                {/* Mostrar equivalencia */}
                {index > 0 && calcularEquivalencia(index) && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-yellow-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                      <span className="text-sm text-yellow-800">
                        <strong>Equivalencia:</strong>{" "}
                        {calcularEquivalencia(index)}
                      </span>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Botón para agregar nueva conversión */}
      <Button
        className="w-full h-16 text-base font-medium border-2 border-dashed"
        color="primary"
        startContent={
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 4v16m8-8H4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        }
        variant="bordered"
        onPress={agregarConversion}
      >
        {isEditMode
          ? "Agregar nueva unidad de venta"
          : "Agregar otra unidad de venta"}
      </Button>

      {/* Modal para nueva unidad */}
      <NuevaUnidadModal
        isOpen={mostrarModal}
        onClose={() => setMostrarModal(false)}
        onSave={handleNuevaUnidad}
      />
    </div>
  );
}
