"use client";
import { Button, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import React, { useState } from "react";
import { toast } from "react-toastify";

import { anularVenta } from "@/actions/sales/void-sale-action";
import { useAuth } from "@/app/context/AuthContext";
import AnularModal from "@/components/ui/AnularModal";
import DetailModalLayout, { InfoTile, TotalRow } from "@/components/ui/DetailModalLayout";
import { ESTADO_ANULADO, MOTIVOS_ANULACION_VENTA, puedeAnularVenta } from "@/src/lib/anulaciones";
import { hoyBolivia } from "@/src/utils/date";
import { formatShortDate, formatTime } from "@/src/utils/period";

export interface DetalleVenta {
  id: number;
  producto: string;
  productoId: number;
  descripcion: string | null;
  unidad: string;
  unidadId: number;
  lote: string;
  loteId: number | null;
  fechaVencimiento?: string | null;
  cantidad: number;
  cantidadUnidadesBase: number;
  precioUnitario: number;
  subtotal: number;
  descuento: number;
  total: number;
  codigoBarras: string | null;
  codigoBarrasId: number | null;
}

export interface Venta {
  id: number;
  numeroVenta: string;
  fecha: string;
  cliente: { id: number; nombre: string; carnet: string; correo: string };
  subtotal: number;
  descuento: number;
  impuestos: number;
  total: number;
  montoRecibido: number;
  cambio: number;
  metodoPago: number;
  estado: number;
  /** Quién registró la venta */
  usuarioRegistro?: number;
  /** Solo si la venta está anulada */
  anulacion?: { motivo: string; usuario: string; fecha: string } | null;
  detalles: DetalleVenta[];
}

export function getMetodoPago(metodo: number): { label: string; color: "primary" | "success" | "warning" } {
  const metodos: Record<number, { label: string; color: "primary" | "success" | "warning" }> = {
    1: { label: "Efectivo", color: "success" },
    2: { label: "Tarjeta", color: "primary" },
    3: { label: "Transferencia", color: "warning" },
  };

  return metodos[metodo] || { label: "Desconocido", color: "primary" };
}

export default function SaleDetailModal({
  venta,
  isOpen,
  onClose,
  onAnulada,
}: {
  venta: Venta | null;
  isOpen: boolean;
  onClose: () => void;
  /** Se llama cuando la venta se anuló, para que la lista se recargue */
  onAnulada?: () => void;
}) {
  const { user } = useAuth();
  const [anulando, setAnulando] = useState(false);

  if (!venta) return null;
  const pago = getMetodoPago(venta.metodoPago);
  const anulada = venta.estado === ESTADO_ANULADO;
  const puedeAnular =
    !anulada &&
    puedeAnularVenta(user?.rol, {
      esSuya: venta.usuarioRegistro === user?.id,
      esDeHoy: venta.fecha.slice(0, 10) === hoyBolivia(),
    });

  const confirmarAnulacion = async (motivo: string, comentario: string) => {
    if (!user) return;
    const r = await anularVenta({ ventaId: venta.id, motivo, comentario, usuarioId: user.id });

    if (r.success) {
      toast.success("Venta anulada: el producto volvió al estante.");
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
        ) : (
          <Chip color="success" size="lg" variant="flat">
            Bs. {venta.total.toFixed(2)}
          </Chip>
        )
      }
      footerExtra={
        puedeAnular ? (
          <Button color="danger" radius="lg" startContent={<Icon height="18" icon="heroicons:no-symbol" width="18" />} variant="flat" onPress={() => setAnulando(true)}>
            Anular venta
          </Button>
        ) : undefined
      }
      icon="mdi:receipt-text-outline"
      isOpen={isOpen}
      subtitle={`${venta.numeroVenta} · ${formatShortDate(venta.fecha)}, ${formatTime(venta.fecha)}`}
      title="Detalle de la venta"
      onClose={onClose}
    >
      {anulada && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">
          <p className="font-semibold flex items-center gap-1.5">
            <Icon height="16" icon="heroicons:no-symbol" width="16" />
            Venta anulada
          </p>
          {venta.anulacion ? (
            <p className="mt-0.5">
              {venta.anulacion.motivo} · por {venta.anulacion.usuario} el {formatShortDate(venta.anulacion.fecha)}, {formatTime(venta.anulacion.fecha)}
            </p>
          ) : (
            <p className="mt-0.5">No se muestra el motivo (falta el registro de anulaciones).</p>
          )}
          <p className="mt-0.5 text-red-700">No cuenta en los reportes y el producto volvió al estante.</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoTile icon="heroicons:user" label="Cliente">
          {venta.cliente.nombre}
        </InfoTile>
        <InfoTile icon="heroicons:identification" label="Carnet">
          {venta.cliente.carnet}
        </InfoTile>
        <InfoTile icon="heroicons:credit-card" label="Forma de pago">
          {pago.label}
        </InfoTile>
        <InfoTile icon="heroicons:cube" label="Productos">
          {venta.detalles.length}
        </InfoTile>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Qué se vendió</h4>
        <div className="rounded-xl border border-default-200 divide-y divide-default-100">
          {venta.detalles.map((d) => (
            <div key={d.id} className="p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-sm">{d.producto}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className="text-xs text-gray-500">{d.unidad}</span>
                  <Chip size="sm" variant="flat">
                    Lote {d.lote}
                  </Chip>
                  {d.codigoBarras && (
                    <Chip color="secondary" size="sm" variant="flat">
                      <span className="flex items-center gap-1 font-mono">
                        <Icon height="12" icon="mdi:barcode" width="12" />
                        {d.codigoBarras}
                      </span>
                    </Chip>
                  )}
                </div>
                {d.cantidadUnidadesBase !== d.cantidad && (
                  <p className="text-xs text-primary-600 mt-1">
                    Equivale a {d.cantidadUnidadesBase} unidades base
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-500">
                  {d.cantidad} × Bs. {d.precioUnitario.toFixed(2)}
                </p>
                {d.descuento > 0 && (
                  <p className="text-xs text-red-600">- Bs. {d.descuento.toFixed(2)} desc.</p>
                )}
                <p className="font-bold text-sm">Bs. {d.total.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-default-50 border border-default-100 p-4 space-y-2">
        <TotalRow label="Subtotal" value={`Bs. ${venta.subtotal.toFixed(2)}`} />
        {venta.descuento > 0 && (
          <TotalRow label="Descuento" tone="danger" value={`- Bs. ${venta.descuento.toFixed(2)}`} />
        )}
        <div className="border-t border-default-200 pt-2">
          <TotalRow big label="Total" tone="success" value={`Bs. ${venta.total.toFixed(2)}`} />
        </div>
        <TotalRow label="Monto recibido" value={`Bs. ${venta.montoRecibido.toFixed(2)}`} />
        <TotalRow label="Cambio devuelto" value={`Bs. ${venta.cambio.toFixed(2)}`} />
      </div>
    </DetailModalLayout>

    <AnularModal
      aviso="El producto vuelve al estante, el código de barras (si se escaneó) vuelve a estar disponible y la venta deja de contar en los reportes. No se puede deshacer."
      confirmText="Anular venta"
      isOpen={anulando}
      motivos={MOTIVOS_ANULACION_VENTA}
      subtitle={`${venta.numeroVenta} · Bs. ${venta.total.toFixed(2)}`}
      title="Anular venta"
      onClose={() => setAnulando(false)}
      onConfirm={confirmarAnulacion}
    />
    </>
  );
}
