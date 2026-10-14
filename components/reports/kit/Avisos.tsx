"use client";
import { Icon } from "@iconify/react";
import React from "react";

export type Aviso = { tono: "alerta" | "ok" | "info"; texto: React.ReactNode };

const ESTILO = {
  alerta: { clase: "bg-amber-50 text-amber-900 border-amber-200", icono: "heroicons:exclamation-triangle", color: "text-amber-600" },
  ok: { clase: "bg-green-50 text-green-800 border-green-200", icono: "heroicons:check-circle", color: "text-green-600" },
  info: { clase: "bg-secondary-50 text-secondary-900 border-secondary-200", icono: "heroicons:light-bulb", color: "text-secondary-600" },
} as const;

/** Avisos compactos de una línea: solo lo que de verdad hay que mirar (no ocupan lugar si no hay nada) */
export default function Avisos({ items }: { items: Aviso[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((a, i) => (
        <span key={i} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${ESTILO[a.tono].clase}`}>
          <Icon className={`shrink-0 ${ESTILO[a.tono].color}`} height="14" icon={ESTILO[a.tono].icono} width="14" />
          {a.texto}
        </span>
      ))}
    </div>
  );
}
