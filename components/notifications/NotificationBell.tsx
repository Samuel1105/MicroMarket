"use client";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import { Icon } from "@iconify/react";
import React from "react";

import { NotificacionItem } from "@/actions/notifications/notifications-action";
import AccionAviso from "@/components/notifications/AccionAviso";
import { useNotifications } from "@/hooks/useNotifications";

export const ICONOS: Record<NotificacionItem["tipo"], { icon: string; caja: string; accion: string }> = {
  estante_vacio: { icon: "heroicons:archive-box-arrow-down", caja: "bg-primary-50 text-primary-600", accion: "Ir a sacar producto" },
  comprar: { icon: "heroicons:shopping-cart", caja: "bg-secondary-50 text-secondary-600", accion: "Ir a comprar" },
};

export function haceCuanto(iso: string): string {
  const min = Math.max(Math.round((Date.now() - new Date(iso).getTime()) / 60000), 0);

  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.round(min / 60)} h`;

  return `hace ${Math.round(min / 1440)} d`;
}

export default function NotificationBell() {
  const { items, descartar } = useNotifications({ avisar: true });

  return (
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <button
          aria-label={`Tareas pendientes: ${items.length}`}
          className="relative w-9 h-9 rounded-lg flex items-center justify-center text-gray-600 hover:bg-default-100 transition-colors"
          type="button"
        >
          <Icon height="22" icon="heroicons:bell" width="22" />
          {items.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
              {items.length > 9 ? "9+" : items.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[340px] max-w-[calc(100vw-24px)]">
        <div className="w-full">
          <div className="px-4 py-3 border-b border-default-200">
            <p className="font-bold text-sm">Tareas pendientes</p>
            <p className="text-xs text-gray-500">Se cierran solas cuando las haces</p>
          </div>
          <div className="max-h-[380px] overflow-y-auto divide-y divide-default-100">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No tienes tareas pendientes 🎉</div>
            ) : (
              items.map((n) => (
                <div key={n.id} className="p-3 flex gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${ICONOS[n.tipo].caja}`}>
                    <Icon height="18" icon={ICONOS[n.tipo].icon} width="18" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-tight">{n.titulo}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{n.mensaje}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <AccionAviso n={n} textoComprar={ICONOS.comprar.accion} textoSacar={ICONOS.estante_vacio.accion} />
                      <button className="text-xs text-gray-400 hover:text-gray-600" type="button" onClick={() => descartar(n.id)}>
                        Descartar
                      </button>
                      <span className="text-[11px] text-gray-400 ml-auto">{haceCuanto(n.fecha)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
