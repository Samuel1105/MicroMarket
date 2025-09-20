import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";

import { ConfirmationModal } from "../ui/ConfirmationModal";

import { Supplier } from "@/src/schema/SchemaContact";
import { useAuth } from "@/app/context/AuthContext";
import { useConfirmationModal } from "@/hooks/useConfirmationModal";
import { deleteSupplierAction } from "@/actions/proveedores/update-supplier";

type DeleteUserConfirmProp = {
  proveedor: Supplier;
  onDeleteSuccess?: () => void;
};

export default function DeleteSupplierConfirm({
  proveedor,
  onDeleteSuccess,
}: DeleteUserConfirmProp) {
  const { user } = useAuth();
  const {
    isOpen,
    config,
    isLoading: modalLoading,
    openModal,
    closeModal,
    handleConfirm,
  } = useConfirmationModal();

  const handleDeleteUser = (userId: number, userName: string) => {
    openModal({
      title: "Confirmar Eliminación",
      message: `¿Estás seguro de que deseas eliminar al proveedor "${userName}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      type: "danger",
      onConfirm: async () => {
        if (!user?.id) {
          console.error("No se pudo obtener el ID del proveedor actual");

          return;
        }

        const result = await deleteSupplierAction(userId, user?.id);

        if (result?.success) {
          toast.success(result.message);
          onDeleteSuccess?.();
        } else {
          console.error("Error al eliminar proveedor:", result?.error);
          // Opcional: Mostrar toast de error
        }
      },
    });
  };

  return (
    <>
      <button
        className="transition-transform hover:scale-110"
        onClick={() => handleDeleteUser(proveedor.id, `${proveedor.nombre} `)}
      >
        <Icon color="red" height="24" icon="weui:delete-outlined" width="24" />
      </button>
      <ConfirmationModal
        cancelText={config?.cancelText}
        confirmText={config?.confirmText}
        isLoading={modalLoading}
        isOpen={isOpen}
        message={config?.message || ""}
        title={config?.title || ""}
        type={config?.type}
        onClose={closeModal}
        onConfirm={handleConfirm}
      />
    </>
  );
}
