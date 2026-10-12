"use client";

import { Button, Chip, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

import { useAuth } from "@/app/context/AuthContext";
import {
  cancelarSolicitud,
  getSolicitudesPendientes,
  quitarProductoDeSolicitud,
  SolicitudResumen,
} from "@/actions/purchase/purchase-request-action";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { num } from "@/src/utils/report-format";

const cant = (n: number) => num(n, n % 1 ? 1 : 0);
const fechaHora = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");

  // Las fechas se guardan como hora de pared de Bolivia dentro de campos UTC
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};

export default function PurchaseRequestsView() {
  const router = useRouter();
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<SolicitudResumen[] | null>(null);
  const [confirmando, setConfirmando] = useState<number | null>(null);

  const cargar = useCallback(() => {
    getSolicitudesPendientes().then(setSolicitudes).catch(() => setSolicitudes([]));
  }, []);

  useEffect(cargar, [cargar]);

  const quitar = async (detalleId: number) => {
    await quitarProductoDeSolicitud({ detalleId, usuarioId: user?.id ?? 0 });
    cargar();
  };

  const cancelar = async (id: number) => {
    const r = await cancelarSolicitud({ id, usuarioId: user?.id ?? 0 });

    setConfirmando(null);
    if (r.success) toast.success("Solicitud cancelada");
    cargar();
  };

  return (
    <div className="p-4 md:p-8 space-y-5">
      <Breadcrumbs items={[{ label: "Compras", href: "/Dashboard/Purchase/List" }, { label: "Solicitudes de compra" }]} />

      <div className="rounded-2xl bg-white border border-default-200 shadow-sm p-5 sm:p-6 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold leading-tight">Solicitudes de compra</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Productos que hay que comprar y que todavía no confirmaste. Se arman solas desde los avisos: completa cantidad
            y precio y se convierten en compra.
          </p>
        </div>
        <Button color="primary" startContent={<Icon height="18" icon="heroicons:plus" width="18" />} onPress={() => router.push("/Dashboard/Purchase/New")}>
          Compra sin solicitud
        </Button>
      </div>

      {solicitudes === null ? (
        <div className="flex justify-center py-20">
          <Spinner label="Cargando..." size="lg" />
        </div>
      ) : solicitudes.length === 0 ? (
        <div className="rounded-2xl bg-white border border-dashed border-default-300 p-12 text-center">
          <Icon className="mx-auto text-gray-300" height="44" icon="heroicons:clipboard-document-check" width="44" />
          <p className="font-semibold mt-3">No tienes solicitudes pendientes</p>
          <p className="text-sm text-gray-500 mt-1">
            Cuando el cajero avise que un producto se acabó, toca “Ir a comprar” en el aviso y aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {solicitudes.map((s) => (
            <div key={s.id} className="rounded-2xl bg-white border border-default-200 shadow-sm p-5">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-base">{s.proveedor.nombre}</p>
                    <Chip color="secondary" size="sm" variant="flat">
                      {s.numero}
                    </Chip>
                    <Chip size="sm" variant="flat">
                      Borrador
                    </Chip>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Armada por {s.solicitante} el {fechaHora(s.fecha)} · {s.productos.length}{" "}
                    {s.productos.length === 1 ? "producto" : "productos"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {confirmando === s.id ? (
                    <>
                      <span className="text-sm text-gray-600">¿Cancelar la solicitud?</span>
                      <Button color="danger" size="sm" onPress={() => cancelar(s.id)}>
                        Sí, cancelar
                      </Button>
                      <Button size="sm" variant="light" onPress={() => setConfirmando(null)}>
                        No
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="light" onPress={() => setConfirmando(s.id)}>
                        Cancelar
                      </Button>
                      <Button
                        color="primary"
                        startContent={<Icon height="16" icon="heroicons:shopping-cart" width="16" />}
                        onPress={() => router.push(`/Dashboard/Purchase/New?solicitud=${s.id}`)}
                      >
                        Completar compra
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <ul className="mt-4 divide-y divide-default-100 border-t border-default-100">
                {s.productos.map((p) => (
                  <li key={p.detalleId} className="py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{p.nombre}</p>
                      <p className="text-xs text-gray-500">
                        En el estante {cant(p.estante)} {p.unidad} · en el almacén {cant(p.almacen)} {p.unidad} · mínimo{" "}
                        {cant(p.minimo)} {p.unidad}
                      </p>
                    </div>
                    <button
                      aria-label={`Quitar ${p.nombre} de la solicitud`}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      type="button"
                      onClick={() => quitar(p.detalleId)}
                    >
                      <Icon height="18" icon="heroicons:x-mark" width="18" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
