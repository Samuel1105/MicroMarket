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
import { Icon } from "@iconify/react";
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
      radius="lg"
      onClose={handleClose}
    >
      <ModalContent>
        <form>
          <ModalHeader className="flex flex-col gap-1 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-green-100 text-green-600 shrink-0">
                <Icon icon="mdi:ruler-square-compass" width="24" height="24" />
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
                <Icon icon="mdi:tag-outline" width="18" height="18" className="text-gray-400" />
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
                <Icon icon="mdi:file-document-outline" width="18" height="18" className="text-gray-400" />
              }
              variant="bordered"
            />

            <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Icon icon="mdi:information-outline" width="18" height="18" className="text-primary-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-primary-700">
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
              color="default"
              isDisabled={isSubmitting}
              radius="lg"
              type="button"
              variant="flat"
              onPress={handleClose}
            >
              Cancelar
            </Button>
            <Button
              color="success"
              isDisabled={!isValid}
              isLoading={isSubmitting}
              radius="lg"
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
