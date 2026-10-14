"use client";
import { Icon } from "@iconify/react";
import {
  Button,
  Input,
  Select,
  SelectItem,
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
    <div className="space-y-4">
      {fields.map((field, index) => {
        const isExistingConversion =
          isEditMode && watchedConversiones[index]?.id;
        const esBase = index === 0;
        const factor = Number(watchedConversiones?.[index]?.factorConversion) || 1;
        const precio = Number(watchedConversiones?.[index]?.precioVentaUnitario) || 0;
        const equivalencia = calcularEquivalencia(index);

        return (
          <div
            key={field.id}
            className={`rounded-xl border p-4 ${
              esBase ? "border-green-300 bg-green-50/40" : "border-gray-200 bg-gray-50/50"
            }`}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Chip color={esBase ? "success" : "primary"} size="sm" variant="flat">
                  {esBase ? "Unidad base" : `Unidad de venta ${index + 1}`}
                </Chip>
                {isExistingConversion ? (
                  <Chip size="sm" variant="light">
                    Ya existe
                  </Chip>
                ) : (
                  !esBase && (
                    <Chip color="success" size="sm" variant="light">
                      Nueva
                    </Chip>
                  )
                )}
                {esBase && (
                  <span className="text-xs text-gray-500">
                    La más pequeña: en ella se cuenta el stock.
                  </span>
                )}
              </div>

              {!esBase && (
                <Button
                  isIconOnly
                  aria-label="Quitar esta unidad"
                  color="danger"
                  size="sm"
                  variant="light"
                  onPress={() => eliminarConversion(index)}
                >
                  <Icon height="18" icon="heroicons:trash" width="18" />
                </Button>
              )}
            </div>

            {isExistingConversion && (
              <Controller
                control={control}
                name={`conversiones.${index}.id`}
                render={({ field }) => <input type="hidden" {...field} />}
              />
            )}

            <div className={`grid grid-cols-1 items-start gap-x-3 gap-y-8 pt-3 ${esBase ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
              <Controller
                control={control}
                name={`conversiones.${index}.unidadOrigenID`}
                render={({ field }) => (
                  <div className="flex items-start gap-2">
                    <Select
                      {...field}
                      isRequired
                      className="flex-1"
                      isLoading={loading}
                      label="Unidad de Medida"
                      labelPlacement="outside"
                      placeholder="Seleccionar"
                      // Un arreglo con el id como texto: pasar el texto suelto lo "parte" en letras y los ids de 2 cifras (10, 12…) no se seleccionaban
                      selectedKeys={field.value ? [String(field.value)] : []}
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
                      aria-label="Crear nueva unidad"
                      className="mt-[26px]"
                      title="Crear nueva unidad"
                      variant="bordered"
                      onPress={() => setMostrarModal(true)}
                    >
                      <Icon height="18" icon="heroicons:plus" width="18" />
                    </Button>
                  </div>
                )}
              />

              {!esBase && (
                <Controller
                  control={control}
                  name={`conversiones.${index}.factorConversion`}
                  render={({ field }) => (
                    <Input
                      {...field}
                      isRequired
                      description="¿Cuántas unidades base trae?"
                      label="Factor de Conversión"
                      labelPlacement="outside"
                      min="0.01"
                      placeholder="1.00"
                      step="0.01"
                      type="number"
                      value={field.value?.toString() || ""}
                      variant="bordered"
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 1)
                      }
                    />
                  )}
                />
              )}

              <Controller
                control={control}
                name={`conversiones.${index}.precioVentaUnitario`}
                render={({ field }) => (
                  <Input
                    {...field}
                    isRequired
                    description={isExistingConversion ? "Puedes actualizar el precio" : "Lo que paga el cliente"}
                    label="Precio de Venta"
                    labelPlacement="outside"
                    min="0"
                    placeholder="0.00"
                    startContent={<span className="text-sm text-gray-500">Bs.</span>}
                    step="0.01"
                    type="number"
                    value={field.value?.toString() || ""}
                    variant="bordered"
                    onChange={(e) =>
                      field.onChange(parseFloat(e.target.value) || 0)
                    }
                  />
                )}
              />
            </div>

            {!esBase && equivalencia && (
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white px-3 py-2 text-xs text-gray-600">
                <span>
                  <Icon className="mr-1 inline" height="14" icon="heroicons:information-circle" width="14" />
                  <strong>{equivalencia}</strong>
                </span>
                {precio > 0 && factor > 0 && (
                  <span>· Sale a Bs. {(precio / factor).toFixed(2)} por unidad base</span>
                )}
              </p>
            )}
          </div>
        );
      })}

      <Button
        className="w-full border-2 border-dashed"
        color="primary"
        startContent={<Icon height="18" icon="heroicons:plus" width="18" />}
        variant="bordered"
        onPress={agregarConversion}
      >
        {isEditMode ? "Agregar nueva unidad de venta" : "Agregar otra unidad de venta"}
      </Button>

      <NuevaUnidadModal
        isOpen={mostrarModal}
        onClose={() => setMostrarModal(false)}
        onSave={handleNuevaUnidad}
      />
    </div>
  );
}
