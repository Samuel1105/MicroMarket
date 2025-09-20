import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";

import { ConfirmationModal } from "../ui/ConfirmationModal";

import { CustomerDelete } from "@/src/schema/SchemaContact";
import { useAuth } from "@/app/context/AuthContext";
import { useConfirmationModal } from "@/hooks/useConfirmationModal";
import { deleteCustomerAction } from "@/actions/clientes/update-customer-action";

type DeleteUserConfirmProp = {
  cliente: CustomerDelete;
  onDeleteSuccess?: () => void;
};

export default function DeleteCustomerConfirm({
  cliente,
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
      message: `¿Estás seguro de que deseas eliminar al cliente "${userName}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      type: "danger",
      onConfirm: async () => {
        if (!user?.id) {
          console.error("No se pudo obtener el ID del usuario actual");

          return;
        }

        const result = await deleteCustomerAction(userId, user?.id);

        if (result?.success) {
          toast.success(result.message);
          onDeleteSuccess?.();
        } else {
          console.error("Error al eliminar usuario:", result?.error);
          // Opcional: Mostrar toast de error
        }
      },
    });
  };

  return (
    <>
      <button
        className="transition-transform hover:scale-110"
        onClick={() => handleDeleteUser(cliente.id, `${cliente.nombre} `)}
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
