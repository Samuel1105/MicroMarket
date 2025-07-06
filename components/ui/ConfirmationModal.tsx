"use client";
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
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
    type?: 'danger' | 'warning' | 'info';
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
    type = 'danger'
}: ConfirmationModalProps) {
    const getIcon = () => {
        switch (type) {
            case 'danger':
                return <Icon icon="heroicons:exclamation-triangle" width="48" height="48" className="text-red-500" />;
            case 'warning':
                return <Icon icon="heroicons:exclamation-triangle" width="48" height="48" className="text-yellow-500" />;
            case 'info':
                return <Icon icon="heroicons:information-circle" width="48" height="48" className="text-blue-500" />;
            default:
                return <Icon icon="heroicons:exclamation-triangle" width="48" height="48" className="text-red-500" />;
        }
    };

    const getConfirmButtonColor = () => {
        switch (type) {
            case 'danger':
                return 'danger';
            case 'warning':
                return 'warning';
            case 'info':
                return 'primary';
            default:
                return 'danger';
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose}
            isDismissable={!isLoading}
            hideCloseButton={isLoading}
        >
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        {getIcon()}
                        <span className="text-lg font-semibold">{title}</span>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {message}
                    </p>
                </ModalBody>
                <ModalFooter>
                    <Button 
                        color="default" 
                        variant="light" 
                        onPress={onClose}
                        disabled={isLoading}
                    >
                        {cancelText}
                    </Button>
                    <Button 
                        color={getConfirmButtonColor()} 
                        onPress={onConfirm}
                        isLoading={isLoading}
                        disabled={isLoading}
                    >
                        {confirmText}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}