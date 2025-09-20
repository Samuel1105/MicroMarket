import { useState } from "react";

interface ConfirmationConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  onConfirm: () => void | Promise<void>;
}

export function useConfirmationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ConfirmationConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const openModal = (modalConfig: ConfirmationConfig) => {
    setConfig(modalConfig);
    setIsOpen(true);
  };

  const closeModal = () => {
    if (!isLoading) {
      setIsOpen(false);
      setConfig(null);
    }
  };

  const handleConfirm = async () => {
    if (!config) return;

    setIsLoading(true);
    try {
      await config.onConfirm();
      closeModal();
    } catch (error) {
      console.error("Error en confirmación:", error);
      // Aquí podrías mostrar un toast de error
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isOpen,
    config,
    isLoading,
    openModal,
    closeModal,
    handleConfirm,
  };
}
