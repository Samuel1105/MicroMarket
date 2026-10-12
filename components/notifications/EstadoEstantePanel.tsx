"use client";
import { Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

import { useAuth } from "@/app/context/AuthContext";
import { enviarAvisoProducto, getEstadoEstante, NivelEstante, ProductoEstante } from "@/actions/notifications/notifications-action";
import { num } from "@/src/utils/report-format";

const VISIBLES = 6;
const REFRESCO_MS = 30000;

const NIVEL: Record<NivelEstante, { label: string; color: "danger" | "warning" | "default" }> = {
  agotado: { label: "Estante vacío", color: "danger" },
  por_acabarse: { label: "Se acaba pronto", color: "warning" },
  sin_reposicion: { label: "Sin reposición", color: "warning" },
};

const cant = (n: number) => num(n, n % 1 ? 1 : 0);

/**
 * Para el cajero y el administrador: qué productos se están acabando en el estante y, con un toque,
 * avisar a Almacén (sacar más) o a Compras (ya no queda ni en el almacén).
 */
export default function EstadoEstantePanel() {
  const { user } = useAuth();
  const [items, setItems] = useState<ProductoEstante[] | null>(null);
  const [enviando, setEnviando] = useState<number | null>(null);
  const [verTodos, setVerTodos] = useState(false);

  const cargar = useCallback(() => {
    getEstadoEstante().then(setItems).catch(() => setItems([]));
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, REFRESCO_MS);

    return () => clearInterval(t);
  }, [cargar]);

  const avisar = async (p: ProductoEstante) => {
    if (!user) return;
    setEnviando(p.id);
    const r = await enviarAvisoProducto({ tipo: p.accion, productoID: p.id, usuarioId: user.id });

    setEnviando(null);
    if (r.success) {
      toast.success(p.accion === "estante_vacio" ? "Aviso enviado a Almacén" : "Aviso enviado a Compras");
    } else {
      toast.error("error" in r && r.error ? r.error : "No se pudo enviar el aviso");
    }
    cargar();
  };

  const lista = items ?? [];
  const mostrados = verTodos ? lista : lista.slice(0, VISIBLES);

  return (
    <div className="rounded-2xl bg-white border border-default-200 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="font-bold text-base">Estado del estante</h2>
          <p className="text-xs text-gray-500">
            Productos que se están acabando. Avisa a Almacén para que saque más, o a Compras si ya no queda en ningún lado.
          </p>
        </div>
        {lista.length > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">{lista.length}</span>
        )}
      </div>

      {items === null ? (
        <div className="h-16 rounded-xl bg-default-100 animate-pulse" />
      ) : lista.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl bg-green-50 text-green-800 text-sm px-4 py-3">
          <Icon className="text-green-600 shrink-0" height="20" icon="heroicons:check-circle" width="20" />
          El estante está bien surtido: ningún producto se está acabando.
        </div>
      ) : (
        <ul className="space-y-2">
          {mostrados.map((p) => {
            const comprar = p.accion === "comprar";

            return (
              <li key={p.id} className="rounded-xl border border-default-200 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{p.nombre}</p>
                    <Chip color={NIVEL[p.nivel].color} size="sm" variant="flat">
                      {NIVEL[p.nivel].label}
                    </Chip>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    En el estante: <b>{cant(p.estante)}</b> {p.unidad} · En el almacén: <b>{cant(p.almacen)}</b> {p.unidad}
                    {p.cobertura !== null && p.estante > 0 && (
                      <> · alcanza para {num(p.cobertura, 1)} {p.cobertura === 1 ? "día" : "días"}</>
                    )}
                  </p>
                </div>
                {p.avisoEnviado ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 rounded-lg px-3 py-2 shrink-0">
                    <Icon height="16" icon="heroicons:check" width="16" />
                    {comprar ? "Compras ya fue avisado" : "Almacén ya fue avisado"}
                  </span>
                ) : (
                  <button
                    className={`flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3.5 py-2 shrink-0 transition-colors disabled:opacity-60 ${
                      comprar
                        ? "bg-secondary-50 text-secondary-700 hover:bg-secondary-100"
                        : "bg-primary-50 text-primary-700 hover:bg-primary-100"
                    }`}
                    disabled={enviando === p.id}
                    type="button"
                    onClick={() => avisar(p)}
                  >
                    <Icon height="16" icon={comprar ? "heroicons:shopping-cart" : "heroicons:archive-box-arrow-down"} width="16" />
                    {comprar ? "Avisar a Compras: comprar" : "Avisar a Almacén: sacar más"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {lista.length > VISIBLES && (
        <button
          className="mt-3 text-sm font-semibold text-primary-600 hover:underline"
          type="button"
          onClick={() => setVerTodos((v) => !v)}
        >
          {verTodos ? "Ver menos" : `Ver los ${lista.length} productos`}
        </button>
      )}
    </div>
  );
}
