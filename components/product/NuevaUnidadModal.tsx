"use client";
import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from "@heroui/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  nuevaUnidadFormSchema,
  NuevaUnidadForm,
} from "@/src/schema/SchemaProduts";

interface NuevaUnidadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (unidad: { nombre: string; abreviatura: string }) => void;
}

export default function NuevaUnidadModal({
  isOpen,
  onClose,
  onSave,
}: NuevaUnidadModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<NuevaUnidadForm>({
    resolver: zodResolver(nuevaUnidadFormSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: NuevaUnidadForm) => {
    try {
      await onSave(data);
      reset();
      onClose();
    } catch (error) {
      console.error("Error al crear nueva unidad:", error);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      backdrop="blur"
      isOpen={isOpen}
      placement="center"
      onClose={handleClose}
    >
      <ModalContent>
        <form>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg
                  className="w-5 h-5 text-green-600"
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
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  Nueva Unidad de Medida
                </h2>
                <p className="text-sm text-gray-500 font-normal">
                  Crear una nueva unidad para este producto
                </p>
              </div>
            </div>
          </ModalHeader>

          <ModalBody className="gap-4">
            <Input
              {...register("nombre")}
              isRequired
              errorMessage={errors.nombre?.message}
              isInvalid={!!errors.nombre}
              label="Nombre de la unidad"
              placeholder="Ej: Docena, Paquete, Metro..."
              startContent={
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.994 1.994 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              }
              variant="bordered"
            />

            <Input
              {...register("abreviatura")}
              isRequired
              description="Máximo 10 caracteres"
              errorMessage={errors.abreviatura?.message}
              isInvalid={!!errors.abreviatura}
              label="Abreviatura"
              maxLength={10}
              placeholder="DOC, PAQ, MT..."
              startContent={
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              }
              variant="bordered"
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0"
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
                <div className="text-xs text-blue-700">
                  <p className="font-medium mb-1">Ejemplos de unidades:</p>
                  <ul className="space-y-1">
                    <li>
                      • Docena (DOC) - para productos que se venden por docenas
                    </li>
                    <li>• Paquete (PAQ) - para productos empaquetados</li>
                    <li>
                      • Metro (MT) - para productos que se miden por longitud
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button
              color="danger"
              isDisabled={isSubmitting}
              type="button"
              variant="light"
              onPress={handleClose}
            >
              Cancelar
            </Button>
            <Button
              color="success"
              isDisabled={!isValid}
              isLoading={isSubmitting}
              type="button"
              onPress={() => handleSubmit(onSubmit)()}
            >
              {isSubmitting ? "Creando..." : "Crear Unidad"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
