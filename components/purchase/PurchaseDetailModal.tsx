"use client";
import { Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import React from "react";

import DetailModalLayout, { InfoTile, TotalRow } from "@/components/ui/DetailModalLayout";
import { formatVencimiento, getDiasParaVencer, getSeveridad } from "@/src/utils/expiry";
import { formatShortDate } from "@/src/utils/period";

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
  detalles: PurchaseDetail[];
}

interface PurchaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
}

export default function PurchaseDetailModal({ isOpen, onClose, purchase }: PurchaseDetailModalProps) {
  if (!purchase) return null;

  const totalUnidades = purchase.detalles.reduce((sum, d) => sum + d.cantidad, 0);

  return (
    <DetailModalLayout
      badge={
        <Chip color="success" size="lg" variant="flat">
          Bs. {purchase.total.toFixed(2)}
        </Chip>
      }
      icon="heroicons:shopping-cart"
      isOpen={isOpen}
      subtitle={`${purchase.numeroCompra} · ${formatShortDate(purchase.fecha)}`}
      title="Detalle de la compra"
      onClose={onClose}
    >
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
  );
}
