"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

import { useAuth } from "@/app/context/AuthContext";
import { descartarNotificacion, NotificacionItem } from "@/actions/notifications/notifications-action";

/**
 * Recibe las tareas pendientes del rol del usuario por Server-Sent Events: una conexión abierta
 * por la que el servidor empuja la lista apenas cambia. Si se corta, el navegador reconecta solo.
 * Las tareas nuevas que llegan mientras la persona trabaja muestran un aviso emergente.
 */
export function useNotifications({ avisar = false }: { avisar?: boolean } = {}) {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificacionItem[]>([]);
  const [cargado, setCargado] = useState(false);
  const vistas = useRef<Set<number> | null>(null);
  const rol = user?.rol;

  useEffect(() => {
    if (!rol) return;

    const fuente = new EventSource(`/api/notifications/stream/?rol=${rol}`);

    fuente.addEventListener("lista", (e) => {
      const lista: NotificacionItem[] = JSON.parse((e as MessageEvent).data);

      if (avisar && vistas.current) {
        for (const n of lista) {
          if (!vistas.current.has(n.id)) toast.info(n.titulo, { toastId: `notif-${n.id}` });
        }
      }
      vistas.current = new Set(lista.map((n) => n.id));
      setItems(lista);
      setCargado(true);
    });

    return () => fuente.close();
  }, [rol, avisar]);

  const descartar = useCallback(
    async (id: number) => {
      setItems((prev) => prev.filter((n) => n.id !== id));
      await descartarNotificacion(id, user?.id ?? 0);
    },
    [user],
  );

  return { items, cargado, descartar };
}
