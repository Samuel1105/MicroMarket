"use client";
import { Button, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import React, { useState } from "react";
import { toast } from "react-toastify";

import { anularCompra } from "@/actions/purchase/void-purchase-action";
import { useAuth } from "@/app/context/AuthContext";
import AnularModal from "@/components/ui/AnularModal";
import DetailModalLayout, { InfoTile, TotalRow } from "@/components/ui/DetailModalLayout";
import { ESTADO_ANULADO, MOTIVOS_ANULACION_COMPRA, puedeAnularCompra } from "@/src/lib/anulaciones";
import { ESTADO_COMPRA_POR_RECIBIR, puedeValidarRecepcion } from "@/src/lib/compras";
import { formatVencimiento, getDiasParaVencer, getSeveridad } from "@/src/utils/expiry";
import { formatShortDate, formatTime } from "@/src/utils/period";

interface PurchaseDetail {
  id: number;
  producto: string;
  productoId: number;
  unidad: string;
  unidadId: number;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  descuento: number;
  total: number;
  lote: string;
  loteId: number | null;
  fechaVencimiento: string | null;
  cantidadUnidadesBase: number;
}

interface Purchase {
  id: number;
  numeroCompra: string;
  fecha: string;
  proveedor: {
    id: number;
    nombre: string;
  };
  subtotal: number;
  descuento: number;
  total: number;
  estado: number;
  /** Solo si la compra está anulada */
  anulacion?: { motivo: string; usuario: string; fecha: string } | null;
  registradaPor?: string;
  fechaHora?: string | null;
  recepcion?: { usuario: string; fecha: string | null } | null;
  /** true si ya se sacó mercadería de sus lotes al estante (o se ajustó): ya no se puede anular */
  bloqueada?: boolean;
  detalles: PurchaseDetail[];
}

interface PurchaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
  /** Se llama cuando la compra se anuló, para que la lista se recargue */
  onAnulada?: () => void;
}

export default function PurchaseDetailModal({ isOpen, onClose, purchase, onAnulada }: PurchaseDetailModalProps) {
  const { user } = useAuth();
  const [anulando, setAnulando] = useState(false);

  if (!purchase) return null;

  const totalUnidades = purchase.detalles.reduce((sum, d) => sum + d.cantidad, 0);
  const anulada = purchase.estado === ESTADO_ANULADO;
  const porRecibir = purchase.estado === ESTADO_COMPRA_POR_RECIBIR;
  const rolPuede = puedeAnularCompra(user?.rol);
  const puedeAnular = !anulada && rolPuede && !purchase.bloqueada;

  const confirmarAnulacion = async (motivo: string, comentario: string) => {
    if (!user) return;
    const r = await anularCompra({ compraId: purchase.id, motivo, comentario, usuarioId: user.id });

    if (r.success) {
      toast.success("Compra anulada: la mercadería salió del almacén.");
      setAnulando(false);
      onClose();
      onAnulada?.();
    } else {
      toast.error(r.error);
    }
  };

  return (
    <>
    <DetailModalLayout
      badge={
        anulada ? (
          <Chip color="danger" size="lg" variant="flat">
            Anulada
          </Chip>
        ) : porRecibir ? (
          <Chip color="warning" size="lg" variant="flat">
            Por recibir
          </Chip>
        ) : (
          <Chip color="success" size="lg" variant="flat">
            Bs. {purchase.total.toFixed(2)}
          </Chip>
        )
      }
      footerExtra={
        <>
          {porRecibir && puedeValidarRecepcion(user?.rol) && (
            <Button as={Link} color="success" href="/Dashboard/Purchase/Receipts" radius="lg" startContent={<Icon height="18" icon="heroicons:clipboard-document-check" width="18" />} variant="flat">
              Validar recepción
            </Button>
          )}
          {puedeAnular && (
            <Button color="danger" radius="lg" startContent={<Icon height="18" icon="heroicons:no-symbol" width="18" />} variant="flat" onPress={() => setAnulando(true)}>
              {porRecibir ? "Cancelar pedido" : "Anular compra"}
            </Button>
          )}
        </>
      }
      icon="heroicons:shopping-cart"
      isOpen={isOpen}
      subtitle={`${purchase.numeroCompra} · ${formatShortDate(purchase.fecha)}`}
      title="Detalle de la compra"
      onClose={onClose}
    >
      {anulada && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">
          <p className="font-semibold flex items-center gap-1.5">
            <Icon height="16" icon="heroicons:no-symbol" width="16" />
            Compra anulada
          </p>
          {purchase.anulacion ? (
            <p className="mt-0.5">
              {purchase.anulacion.motivo} · por {purchase.anulacion.usuario} el {formatShortDate(purchase.anulacion.fecha)}
            </p>
          ) : (
            <p className="mt-0.5">No se muestra el motivo (falta el registro de anulaciones).</p>
          )}
          <p className="mt-0.5 text-red-700">No cuenta en los reportes y su mercadería ya no está en el almacén.</p>
        </div>
      )}
      {porRecibir && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-3">
          <p className="font-semibold">Compra confirmada, por recibir</p>
          <p className="mt-0.5">
            La mercadería todavía no entró al almacén: el Gestor de Almacén debe validar lo que llegue (Compras › Recepciones). Hasta entonces no suma al stock ni a los reportes.
          </p>
        </div>
      )}
      {!anulada && rolPuede && purchase.bloqueada && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-3">
          Esta compra ya no se puede anular: de sus lotes ya se sacó mercadería al estante o se ajustó su stock.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoTile icon="heroicons:building-storefront" label="Proveedor">
          {purchase.proveedor.nombre}
        </InfoTile>
        <InfoTile icon="heroicons:calendar" label="Fecha">
          {formatShortDate(purchase.fecha)}
        </InfoTile>
        <InfoTile icon="heroicons:cube" label="Productos">
          {purchase.detalles.length}
        </InfoTile>
        <InfoTile icon="heroicons:archive-box" label="Unidades compradas">
          {totalUnidades}
        </InfoTile>
        {purchase.registradaPor && (
          <InfoTile icon="heroicons:user" label="Registró la compra">
            {purchase.registradaPor}
            {purchase.fechaHora && <span className="block text-xs font-normal text-gray-500">{formatShortDate(purchase.fechaHora)} · {formatTime(purchase.fechaHora)}</span>}
          </InfoTile>
        )}
        {purchase.recepcion && (
          <InfoTile icon="heroicons:clipboard-document-check" label="Validó la recepción">
            {purchase.recepcion.usuario}
            {purchase.recepcion.fecha && <span className="block text-xs font-normal text-gray-500">{formatShortDate(purchase.recepcion.fecha)} · {formatTime(purchase.recepcion.fecha)}</span>}
          </InfoTile>
        )}
        {anulada && purchase.anulacion && (
          <InfoTile icon="heroicons:no-symbol" label="Anulada por">
            {purchase.anulacion.usuario}
            <span className="block text-xs font-normal text-gray-500">{formatShortDate(purchase.anulacion.fecha)} · {formatTime(purchase.anulacion.fecha)}</span>
          </InfoTile>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Qué se compró</h4>
        <div className="rounded-xl border border-default-200 divide-y divide-default-100">
          {purchase.detalles.map((d) => {
            const dias = getDiasParaVencer(d.fechaVencimiento);
            const sev = getSeveridad(dias);
            const esPaquete = d.cantidadUnidadesBase !== d.cantidad;

            return (
              <div key={d.id} className="p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{d.producto}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {d.cantidad} {d.unidad}
                    {esPaquete && (
                      <span className="text-primary-600"> · equivale a {d.cantidadUnidadesBase} unidades base</span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <Chip size="sm" variant="flat">
                      <span className="flex items-center gap-1">
                        <Icon height="12" icon="heroicons:archive-box" width="12" />
                        Lote {d.lote}
                      </span>
                    </Chip>
                    {d.fechaVencimiento && sev && (
                      <Chip color={sev} size="sm" variant="flat">
                        {formatShortDate(d.fechaVencimiento)} · {formatVencimiento(dias)}
                      </Chip>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500">
                    {d.cantidad} × Bs. {d.precioUnitario.toFixed(2)}
                  </p>
                  {d.descuento > 0 && <p className="text-xs text-red-600">- Bs. {d.descuento.toFixed(2)} desc.</p>}
                  <p className="font-bold text-sm">Bs. {d.total.toFixed(2)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl bg-default-50 border border-default-100 p-4 space-y-2">
        <TotalRow label="Subtotal" value={`Bs. ${purchase.subtotal.toFixed(2)}`} />
        {purchase.descuento > 0 && (
          <TotalRow label="Descuento" tone="danger" value={`- Bs. ${purchase.descuento.toFixed(2)}`} />
        )}
        <div className="border-t border-default-200 pt-2">
          <TotalRow big label="Total" tone="success" value={`Bs. ${purchase.total.toFixed(2)}`} />
        </div>
      </div>
    </DetailModalLayout>

    <AnularModal
      aviso="La compra y sus lotes dejan de contar: la mercadería sale del almacén y la compra deja de aparecer en los reportes. Solo es posible mientras no se haya sacado nada de esos lotes al estante. No se puede deshacer."
      confirmText="Anular compra"
      isOpen={anulando}
      motivos={MOTIVOS_ANULACION_COMPRA}
      subtitle={`${purchase.numeroCompra} · Bs. ${purchase.total.toFixed(2)}`}
      title="Anular compra"
      onClose={() => setAnulando(false)}
      onConfirm={confirmarAnulacion}
    />
    </>
  );
}
