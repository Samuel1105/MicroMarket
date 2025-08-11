import { deleteUserAction } from "@/actions/user/update-user-action";
import { useAuth } from "@/app/context/AuthContext"
import { useConfirmationModal } from "@/hooks/useConfirmationModal";
import { ConfirmationModal } from "../ui/ConfirmationModal";
import { Icon } from "@iconify/react/dist/iconify.js";
import { UserListSingular } from "@/src/schema";
//import { ListUser } from "@/actions/list-user-action";
import { toast } from "react-toastify";

type DeleteUserConfirmProp = {
    usuario: UserListSingular;
    onDeleteSuccess?: () => void;
}

export default function DeleteUserConfirm({usuario , onDeleteSuccess }: DeleteUserConfirmProp) {
    const { user } = useAuth()
    const { isOpen, config, isLoading: modalLoading, openModal, closeModal, handleConfirm } = useConfirmationModal();

    const handleDeleteUser = (userId: number, userName: string) => {
        openModal({
            title: "Confirmar Eliminación",
            message: `¿Estás seguro de que deseas eliminar al usuario "${userName}"? Esta acción no se puede deshacer.`,
            confirmText: "Eliminar",
            cancelText: "Cancelar",
            type: "danger",
            onConfirm: async () => {
                if (!user?.id) {
                    console.error("No se pudo obtener el ID del usuario actual");
                    return;
                }

                const result = await deleteUserAction(userId, user?.id);

                if (result?.success) {
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
                    usuario.id,
                    `${usuario.primerNombre} ${usuario.segundoNombre} ${usuario.apellidoPaterno} ${usuario.apellidoMaterno}`
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
