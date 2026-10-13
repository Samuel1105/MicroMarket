"use client";
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Textarea } from "@heroui/react";
import { Icon } from "@iconify/react";
import React, { useEffect, useState } from "react";

/** Pide motivo y comentario antes de anular una venta o una compra */
export default function AnularModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  aviso,
  motivos,
  confirmText = "Anular",
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (motivo: string, comentario: string) => Promise<void>;
  title: string;
  subtitle: string;
  /** Qué va a pasar al anular (se muestra destacado) */
  aviso: string;
  motivos: readonly string[];
  confirmText?: string;
}) {
  const [motivo, setMotivo] = useState("");
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMotivo("");
      setComentario("");
    }
  }, [isOpen]);

  const valido = motivo !== "" && comentario.trim().length >= 3;

  const confirmar = async () => {
    if (!valido) return;
    setEnviando(true);
    try {
      await onConfirm(motivo, comentario);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal backdrop="blur" isOpen={isOpen} radius="lg" size="lg" onClose={() => !enviando && onClose()}>
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1 pt-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-red-100 text-red-600 shrink-0">
                  <Icon height="24" icon="heroicons:no-symbol" width="24" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-tight">{title}</h2>
                  <p className="text-sm text-zinc-500 font-normal">{subtitle}</p>
                </div>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div className="flex gap-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-3">
                  <Icon className="shrink-0 mt-0.5" height="18" icon="heroicons:exclamation-triangle" width="18" />
                  <span>{aviso}</span>
                </div>
                <Select
                  isRequired
                  label="Motivo"
                  placeholder="¿Por qué se anula?"
                  selectedKeys={motivo ? [motivo] : []}
                  variant="bordered"
                  onSelectionChange={(k) => setMotivo((Array.from(k)[0] as string) || "")}
                >
                  {motivos.map((m) => (
                    <SelectItem key={m}>{m}</SelectItem>
                  ))}
                </Select>
                <Textarea
                  isRequired
                  description={`${comentario.trim().length}/150`}
                  label="Comentario"
                  maxLength={150}
                  minRows={2}
                  placeholder="Explica brevemente qué pasó"
                  value={comentario}
                  variant="bordered"
                  onValueChange={setComentario}
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button isDisabled={enviando} radius="lg" variant="flat" onPress={onClose}>
                Cancelar
              </Button>
              <Button color="danger" isDisabled={!valido} isLoading={enviando} radius="lg" onPress={confirmar}>
                {confirmText}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
