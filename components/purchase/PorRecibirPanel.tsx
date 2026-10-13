"use client";
import { Icon } from "@iconify/react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import { contarComprasPorRecibir } from "@/actions/purchase/receive-purchase-action";

/** Aviso del Dashboard: compras confirmadas que esperan que Almacén valide lo que llegó */
export default function PorRecibirPanel() {
  const [n, setN] = useState(0);

  useEffect(() => {
    contarComprasPorRecibir().then(setN).catch(() => setN(0));
  }, []);

  if (n === 0) return null;

  return (
    <Link
      className="flex items-center gap-4 rounded-2xl bg-amber-50 border border-amber-200 p-4 sm:p-5 hover:shadow-md transition-shadow"
      href="/Dashboard/Purchase/Receipts"
    >
      <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
        <Icon height="22" icon="heroicons:truck" width="22" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-amber-900">
          {n} {n === 1 ? "compra por recibir" : "compras por recibir"}
        </p>
        <p className="text-xs text-amber-800">Están confirmadas pero todavía no entraron al almacén: valida lo que llegó en Compras › Recepciones.</p>
      </div>
      <Icon className="text-amber-700 shrink-0" height="20" icon="heroicons:chevron-right" width="20" />
    </Link>
  );
}
