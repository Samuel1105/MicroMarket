"use client";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { Icon } from "@iconify/react/dist/iconify.js";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  type?: "danger" | "warning" | "info";
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isLoading = false,
  type = "danger",
}: ConfirmationModalProps) {
  const styles = {
    danger: {
      icon: "heroicons:exclamation-triangle",
      iconWrap: "bg-red-100 text-red-600",
      accent: "before:bg-red-500",
      confirmColor: "danger" as const,
    },
    warning: {
      icon: "heroicons:exclamation-triangle",
      iconWrap: "bg-amber-100 text-amber-600",
      accent: "before:bg-amber-500",
      confirmColor: "warning" as const,
    },
    info: {
      icon: "heroicons:information-circle",
      iconWrap: "bg-secondary-100 text-secondary-600",
      accent: "before:bg-secondary-500",
      confirmColor: "primary" as const,
    },
  }[type];

  return (
    <Modal
      backdrop="blur"
      hideCloseButton={isLoading}
      isDismissable={!isLoading}
      isOpen={isOpen}
      placement="center"
      radius="lg"
      onClose={onClose}
    >
      <ModalContent
        className={`relative overflow-hidden before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:z-10 ${styles.accent}`}
      >
        <ModalHeader className="flex flex-col gap-1 pt-6">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${styles.iconWrap}`}>
              <Icon height="26" icon={styles.icon} width="26" />
            </div>
            <span className="text-lg font-semibold">{title}</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
        </ModalBody>
        <ModalFooter>
          <Button
            color="default"
            disabled={isLoading}
            radius="lg"
            variant="flat"
            onPress={onClose}
          >
            {cancelText}
          </Button>
          <Button
            color={styles.confirmColor}
            disabled={isLoading}
            isLoading={isLoading}
            radius="lg"
            onPress={onConfirm}
          >
            {confirmText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
