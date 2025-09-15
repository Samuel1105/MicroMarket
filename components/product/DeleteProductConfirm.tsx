import { ConfirmationModal } from "../ui/ConfirmationModal";
import { useAuth } from "@/app/context/AuthContext";
import { useConfirmationModal } from "@/hooks/useConfirmationModal";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import { ProductType } from "@/src/schema/SchemaProduts";
import { deleteProductAction } from "@/actions/products/update-product-action";

type DeleteProductConfirmProp = {
    producto: ProductType ;
    onDeleteSuccess?: () => void;
}

export default function DeleteProductConfirm({ producto, onDeleteSuccess }: DeleteProductConfirmProp) {
    const { user } = useAuth()
    const { isOpen, config, isLoading: modalLoading, openModal, closeModal, handleConfirm } = useConfirmationModal();
    
    const handleDeleteUser = (userId: number, producto: string) => {
        openModal({
            title: "Confirmar Eliminación",
            message: `¿Estás seguro de que deseas eliminar el producto "${producto}"? Esta acción no se puede deshacer.`,
            confirmText: "Eliminar",
            cancelText: "Cancelar",
            type: "danger",
            onConfirm: async () => {
                if (!user?.id) {
                    console.error("No se pudo obtener el ID del producto actual");
                    return;
                }

                const result = await deleteProductAction(userId, user?.id);

                if (result?.ok) {
                    toast.success(result.message)
                    onDeleteSuccess?.();
                } else {
                    console.error("Error al eliminar usuario:", result?.error);
                    // Opcional: Mostrar toast de error
                }
            }
        });
    };
    return (
        <>
            <button
                onClick={() => handleDeleteUser(
                    producto.id!,
                    `${producto.nombre} `
                )}
                className="transition-transform hover:scale-110"
            >
                <Icon icon="weui:delete-outlined" width="24" height="24" color="red" />
            </button>
            <ConfirmationModal
                isOpen={isOpen}
                onClose={closeModal}
                onConfirm={handleConfirm}
                title={config?.title || ""}
                message={config?.message || ""}
                confirmText={config?.confirmText}
                cancelText={config?.cancelText}
                isLoading={modalLoading}
                type={config?.type}
            />
        </>
    )
}
