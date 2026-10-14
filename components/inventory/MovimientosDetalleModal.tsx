"use client";
import { Chip, Input, Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/react";
import { Icon } from "@iconify/react";
import React, { useEffect, useMemo, useState } from "react";

import { InventoryMovement, MovementType } from "@/actions/inventory/inventory-movements-action";
import { formatShortDate, formatTime } from "@/src/utils/period";

const TITULOS: Record<MovementType, { titulo: string; ayuda: string; icon: string; tile: string }> = {
  entrada: { titulo: "Entradas a bodega", ayuda: "Compras que ingresaron al almacén y quién validó la recepción", icon: "heroicons:arrow-down-tray", tile: "bg-green-50 text-green-600" },
  traslado: { titulo: "Traslados al estante", ayuda: "Lo que se sacó del almacén al estante y quién lo sacó", icon: "heroicons:arrows-right-left", tile: "bg-secondary-50 text-secondary-600" },
  salida: { titulo: "Salidas por ventas", ayuda: "Cada producto vendido, a quién y quién lo vendió", icon: "heroicons:arrow-up-tray", tile: "bg-red-50 text-red-600" },
  ajuste: { titulo: "Ajustes de inventario", ayuda: "Correcciones de stock con su motivo y quién las hizo", icon: "heroicons:adjustments-horizontal", tile: "bg-amber-50 text-amber-600" },
};

const num = (n: number) => n.toLocaleString("es-BO", { maximumFractionDigits: 2 });

interface Props {
  tipo: MovementType | null;
  items: InventoryMovement[];
  rangoTexto: string;
  onClose: () => void;
}

export default function MovimientosDetalleModal({ tipo, items, rangoTexto, onClose }: Props) {
  const [q, setQ] = useState("");

  useEffect(() => {
    setQ("");
  }, [tipo]);

  const validos = useMemo(() => items.filter((m) => !m.anulado), [items]);

  // Resumen por producto y unidad: cuántos movimientos y cuántas unidades en total
  const resumen = useMemo(() => {
    const mapa = new Map<string, { producto: string; unidad: string; movimientos: number; total: number }>();

    for (const m of validos) {
      const k = `${m.producto}|${m.unidad}`;
      const r = mapa.get(k) ?? { producto: m.producto, unidad: m.unidad, movimientos: 0, total: 0 };

      r.movimientos += 1;
      r.total += m.cantidad;
      mapa.set(k, r);
    }

    return Array.from(mapa.values()).sort((a, b) => b.movimientos - a.movimientos || a.producto.localeCompare(b.producto));
  }, [validos]);

  const personas = useMemo(() => {
    const mapa = new Map<string, number>();

    for (const m of validos) mapa.set(m.usuario ?? "—", (mapa.get(m.usuario ?? "—") ?? 0) + 1);

    return Array.from(mapa.entries()).sort((a, b) => b[1] - a[1]);
  }, [validos]);

  const filas = useMemo(() => {
    const t = q.trim().toLowerCase();

    if (!t) return items;

    return items.filter((m) =>
      [m.producto, m.lote, m.referencia, m.contraparte, m.codigoBarras, m.usuario, m.detalle, m.ajuste?.motivo].some((v) => v?.toLowerCase().includes(t)),
    );
  }, [items, q]);

  const cfg = tipo ? TITULOS[tipo] : null;

  return (
    <Modal isOpen={!!tipo} placement="center" scrollBehavior="inside" size="5xl" onClose={onClose}>
      <ModalContent>
        {cfg && tipo && (
          <>
            <ModalHeader className="flex items-start gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${cfg.tile}`}>
                <Icon height="24" icon={cfg.icon} width="24" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{cfg.titulo}</h2>
                <p className="text-xs font-normal text-gray-500">
                  {cfg.ayuda} · {rangoTexto}
                </p>
              </div>
            </ModalHeader>

            <ModalBody className="gap-5 pb-6">
              {/* Resumen */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Por producto ({validos.length} {validos.length === 1 ? "movimiento" : "movimientos"})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {resumen.map((r) => (
                      <div key={`${r.producto}|${r.unidad}`} className="rounded-xl border border-default-200 bg-default-50 px-3 py-2">
                        <p className="text-sm font-semibold leading-tight">{r.producto}</p>
                        <p className="text-xs text-gray-500">
                          <span className="font-bold text-gray-800">
                            {num(r.total)} {r.unidad}
                          </span>{" "}
                          · {r.movimientos} {r.movimientos === 1 ? "movimiento" : "movimientos"}
                        </p>
                      </div>
                    ))}
                    {resumen.length === 0 && <p className="text-sm text-gray-500">No hay movimientos de este tipo en el período.</p>}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Quién lo hizo</p>
                  <div className="flex flex-wrap gap-2">
                    {personas.map(([nombre, cant]) => (
                      <Chip key={nombre} startContent={<Icon height="14" icon="heroicons:user" width="14" />} variant="flat">
                        {nombre} · {cant}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detalle */}
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Detalle de cada movimiento</p>
                  <Input
                    className="w-full sm:w-72"
                    placeholder="Buscar producto, lote, persona…"
                    size="sm"
                    startContent={<Icon height="16" icon="heroicons:magnifying-glass" width="16" />}
                    value={q}
                    variant="bordered"
                    onValueChange={setQ}
                  />
                </div>

                <div className="overflow-x-auto rounded-xl border border-default-200">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="bg-default-100 text-xs uppercase tracking-wide text-gray-600">
                      <tr>
                        <th className="px-3 py-2">Fecha y hora</th>
                        <th className="px-3 py-2">Producto</th>
                        <th className="px-3 py-2 text-right">Cantidad</th>
                        <th className="px-3 py-2">Unidad</th>
                        <th className="px-3 py-2">Lote</th>
                        <th className="px-3 py-2">Quién</th>
                        <th className="px-3 py-2">{tipo === "entrada" ? "Compra y proveedor" : tipo === "salida" ? "Venta y cliente" : "Detalle"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-default-100">
                      {filas.map((m) => (
                        <tr key={m.id} className={m.anulado ? "text-gray-400 line-through" : "hover:bg-default-50"}>
                          <td className="whitespace-nowrap px-3 py-2">
                            {formatShortDate(m.fecha)} <span className="text-gray-500">{formatTime(m.fecha)}</span>
                          </td>
                          <td className="px-3 py-2 font-medium">{m.producto}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">
                            {m.tipo === "ajuste" && m.cantidad > 0 ? "+" : ""}
                            {num(m.cantidad)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">{m.unidadNombre}</td>
                          <td className="px-3 py-2">
                            {m.lote ?? "—"}
                            {m.vence && <span className="block text-xs text-gray-500">vence {formatShortDate(m.vence)}</span>}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">{m.usuario ?? "—"}</td>
                          <td className="px-3 py-2 text-xs text-gray-600">
                            {m.tipo === "ajuste" && m.ajuste ? (
                              <>
                                <span className="font-semibold text-amber-700">{m.ajuste.motivo}</span> · {m.ajuste.ubicacion === "almacen" ? "en el almacén" : "en el estante"}
                                {m.ajuste.comentario && <span className="block">“{m.ajuste.comentario}”</span>}
                              </>
                            ) : (
                              <>
                                {m.referencia && <span className="font-medium text-gray-800">{m.referencia}</span>}
                                {m.contraparte && <span> · {m.contraparte}</span>}
                                {m.codigoBarras && <span className="block font-mono">{m.codigoBarras}</span>}
                                {!m.referencia && !m.contraparte && (m.detalle ?? "Del almacén al estante")}
                                {m.anulado && <span className="block">Compra anulada</span>}
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filas.length === 0 && (
                        <tr>
                          <td className="px-3 py-8 text-center text-gray-500" colSpan={7}>
                            Ningún movimiento coincide con la búsqueda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Las cantidades están en la unidad que se usó en cada movimiento (por ejemplo, una venta por Unidad o una compra por Caja).
                </p>
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
