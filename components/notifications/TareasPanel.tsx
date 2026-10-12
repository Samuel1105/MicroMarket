"use client";
import { Icon } from "@iconify/react";
import React from "react";

import { useAuth } from "@/app/context/AuthContext";
import AccionAviso, { useIrAComprar } from "@/components/notifications/AccionAviso";
import { useNotifications } from "@/hooks/useNotifications";
import { haceCuanto, ICONOS } from "@/components/notifications/NotificationBell";

export default function TareasPanel() {
  const { items, cargado, descartar } = useNotifications();
  const { user } = useAuth();
  const { irAComprar, ocupado } = useIrAComprar();
  const porComprar = items.filter((n) => n.tipo === "comprar");
  const puedeComprar = !!user && [1, 5].includes(user.rol);

  return (
    <div className="rounded-2xl bg-white border border-default-200 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="font-bold text-base">Tareas pendientes</h2>
          <p className="text-xs text-gray-500">Avisos que el sistema te manda según lo que va pasando. Se cierran solos al hacerlos.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {puedeComprar && porComprar.length > 1 && (
            <button
              className="flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-1.5 bg-secondary-50 text-secondary-700 hover:bg-secondary-100 transition-colors disabled:opacity-60"
              disabled={ocupado}
              type="button"
              onClick={() => irAComprar(porComprar.map((n) => n.productoID))}
            >
              <Icon height="16" icon="heroicons:shopping-cart" width="16" />
              {ocupado ? "Armando…" : `Comprar todos (${porComprar.length})`}
            </button>
          )}
          {items.length > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold">{items.length}</span>
          )}
        </div>
      </div>

      {!cargado ? (
        <div className="h-16 rounded-xl bg-default-100 animate-pulse" />
      ) : items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl bg-green-50 text-green-800 text-sm px-4 py-3">
          <Icon className="text-green-600 shrink-0" height="20" icon="heroicons:check-circle" width="20" />
          Todo al día: no hay tareas pendientes.
        </div>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {items.map((n) => (
            <li key={n.id} className="rounded-xl border border-default-200 p-3 flex gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ICONOS[n.tipo].caja}`}>
                <Icon height="20" icon={ICONOS[n.tipo].icon} width="20" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">{n.titulo}</p>
                <p className="text-xs text-gray-600 mt-0.5">{n.mensaje}</p>
                <div className="flex items-center gap-3 mt-2">
                  <AccionAviso n={n} textoComprar={`${ICONOS.comprar.accion} →`} textoSacar={`${ICONOS.estante_vacio.accion} →`} />
                  <button className="text-xs text-gray-400 hover:text-gray-600" type="button" onClick={() => descartar(n.id)}>
                    Descartar
                  </button>
                  <span className="text-[11px] text-gray-400 ml-auto">{haceCuanto(n.fecha)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
