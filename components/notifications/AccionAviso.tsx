"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "react-toastify";

import { useAuth } from "@/app/context/AuthContext";
import { NotificacionItem } from "@/actions/notifications/notifications-action";
import { crearSolicitudes } from "@/actions/purchase/purchase-request-action";

/** Lleva a la solicitud de compra: una sola si todos los productos son del mismo proveedor, o la lista si son varias */
export function useIrAComprar() {
  const router = useRouter();
  const { user } = useAuth();
  const [ocupado, setOcupado] = useState(false);

  const irAComprar = async (productoIDs: number[]) => {
    if (!user || ocupado) return;
    setOcupado(true);
    const r = await crearSolicitudes({ productoIDs, usuarioId: user.id });

    setOcupado(false);
    if (!r.success) {
      toast.error(r.error);

      return;
    }
    router.push(r.solicitudIDs.length === 1 ? `/Dashboard/Purchase/New?solicitud=${r.solicitudIDs[0]}` : "/Dashboard/Purchase/Requests");
  };

  return { irAComprar, ocupado };
}

/** Enlace de acción de un aviso: sacar al estante (ir a extracción) o comprar (arma la solicitud y la abre) */
export default function AccionAviso({ n, textoComprar = "Ir a comprar", textoSacar = "Ir a sacar producto" }: { n: NotificacionItem; textoComprar?: string; textoSacar?: string }) {
  const { user } = useAuth();
  const { irAComprar, ocupado } = useIrAComprar();

  if (n.tipo === "estante_vacio") {
    return n.enlace ? (
      <Link className="text-xs font-semibold text-primary-600 hover:underline" href={n.enlace}>
        {textoSacar}
      </Link>
    ) : null;
  }

  // Solo Compras y el administrador arman compras
  if (!user || ![1, 5].includes(user.rol)) return null;

  return (
    <button
      className="text-xs font-semibold text-primary-600 hover:underline disabled:opacity-60"
      disabled={ocupado}
      type="button"
      onClick={() => irAComprar([n.productoID])}
    >
      {ocupado ? "Armando compra…" : textoComprar}
    </button>
  );
}
