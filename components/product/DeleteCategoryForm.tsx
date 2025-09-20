import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";

import { ConfirmationModal } from "../ui/ConfirmationModal";

import { useAuth } from "@/app/context/AuthContext";
import { useConfirmationModal } from "@/hooks/useConfirmationModal";
//import { ListUser } from "@/actions/list-user-action";

import { CategoryDelete } from "@/src/schema/SchemaProduts";
import { deleteCategory } from "@/actions/products/update-category";

type DeleteCategoryConfirmProp = {
  categoria: CategoryDelete;
  onDeleteSuccess?: () => void;
};

export default function DeleteCategoryForm({
  categoria,
  onDeleteSuccess,
}: DeleteCategoryConfirmProp) {
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
      message: `¿Estás seguro de que deseas eliminar la categoria "${userName}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      type: "danger",
      onConfirm: async () => {
        if (!user?.id) {
          console.error("No se pudo obtener el ID de la categoria actual");

          return;
        }

        const result = await deleteCategory(userId, user?.id);

        if (result?.success) {
          toast.success(result.message);
          onDeleteSuccess?.();
        } else {
          console.error("Error al eliminar la categoria:", result?.error);
          // Opcional: Mostrar toast de error
        }
      },
    });
  };

  return (
    <>
      <button
        className="transition-transform hover:scale-110"
        onClick={() => handleDeleteUser(categoria.id, categoria.nombre)}
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
