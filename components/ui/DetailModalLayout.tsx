"use client";
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { Icon } from "@iconify/react";
import { ReactNode } from "react";

export function InfoTile({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-default-50 border border-default-100 p-3 flex items-start gap-2.5 min-w-0">
      <Icon className="text-primary-600 mt-0.5 shrink-0" height="18" icon={icon} width="18" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
        <div className="text-sm font-semibold truncate">{children}</div>
      </div>
    </div>
  );
}

export function TotalRow({
  label,
  value,
  tone = "default",
  big = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "success";
  big?: boolean;
}) {
  const color = tone === "danger" ? "text-red-600" : tone === "success" ? "text-green-600" : "text-gray-800";

  return (
    <div className="flex justify-between items-baseline">
      <span className={big ? "font-bold text-gray-800" : "text-sm text-gray-500"}>{label}</span>
      <span className={`${big ? "text-2xl font-bold" : "text-sm font-semibold"} ${color}`}>{value}</span>
    </div>
  );
}

export default function DetailModalLayout({
  isOpen,
  onClose,
  icon,
  title,
  subtitle,
  badge,
  footerExtra,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  icon: string;
  title: string;
  subtitle: string;
  badge?: ReactNode;
  /** Botones adicionales en el pie (por ejemplo "Anular") */
  footerExtra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Modal
      backdrop="blur"
      classNames={{ base: "max-h-[90vh]" }}
      isOpen={isOpen}
      radius="lg"
      scrollBehavior="inside"
      size="3xl"
      onClose={onClose}
    >
      <ModalContent>
        {(close) => (
          <>
            <ModalHeader className="border-b border-default-100">
              <div className="flex items-center justify-between w-full gap-3 pr-6">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                    <Icon height="24" icon={icon} width="24" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold leading-tight">{title}</h3>
                    <p className="text-sm text-gray-500 font-normal truncate">{subtitle}</p>
                  </div>
                </div>
                {badge}
              </div>
            </ModalHeader>
            <ModalBody className="py-5 space-y-5">{children}</ModalBody>
            <ModalFooter className="border-t border-default-100">
              {footerExtra}
              <Button color="primary" radius="lg" variant="flat" onPress={close}>
                Cerrar
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
