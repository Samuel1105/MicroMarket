"use client";
import { Button, Card, CardBody, Chip, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

import { CompraPorRecibir, getComprasPorRecibir, validarRecepcion } from "@/actions/purchase/receive-purchase-action";
import { useAuth } from "@/app/context/AuthContext";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { puedeValidarRecepcion } from "@/src/lib/compras";
import { hoyBolivia } from "@/src/utils/date";
import { formatShortDate } from "@/src/utils/period";

const cant = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

type Fila = { detalleId: number; recibida: string; lote: string; vence: string };

const CAMPO =
  "w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-200";

export default function PurchaseReceiptsView() {
  const { user } = useAuth();
  const puedeValidar = puedeValidarRecepcion(user?.rol);
  const [compras, setCompras] = useState<CompraPorRecibir[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actual, setActual] = useState<CompraPorRecibir | null>(null);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    const r = await getComprasPorRecibir();

    if (r.success) setCompras(r.data);
    else toast.error(r.error || "No se pudieron cargar las compras por recibir");
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrir = (c: CompraPorRecibir) => {
    setActual(c);
    // Por defecto se asume que llegó todo lo pedido; Almacén corrige lo que difiera
    setFilas(c.lineas.map((l) => ({ detalleId: l.detalleId, recibida: String(l.cantidadPedida), lote: l.numeroLote, vence: l.fechaVencimiento ?? "" })));
  };

  const cambiar = (i: number, cambios: Partial<Fila>) => setFilas((prev) => prev.map((f, k) => (k === i ? { ...f, ...cambios } : f)));

  // ── validación de lo escrito ──
  const hoy = hoyBolivia();
  const estado = (i: number) => {
    const l = actual!.lineas[i];
    const f = filas[i];
    const n = f.recibida.trim() === "" ? NaN : Number(f.recibida);
    const problemas: string[] = [];

    if (!Number.isFinite(n) || n < 0) problemas.push("Cantidad no válida");
    else if (n > l.cantidadPedida + 0.0001) problemas.push(`No puede ser más de lo pedido (${cant(l.cantidadPedida)})`);
    if (Number.isFinite(n) && n > 0) {
      if (!f.lote.trim()) problemas.push("Falta el lote");
      if (f.vence && f.vence < hoy) problemas.push("Está vencido: recíbelo con 0");
    }

    return { n, problemas, falta: Number.isFinite(n) ? l.cantidadPedida - n : 0 };
  };

  const detalle = actual ? actual.lineas.map((_, i) => estado(i)) : [];
  const algunaRecibida = detalle.some((d) => Number.isFinite(d.n) && d.n > 0);
  const valido = !!actual && detalle.every((d) => d.problemas.length === 0) && algunaRecibida;
  const conDiferencia = detalle.filter((d) => d.falta > 0.0001).length;

  const confirmar = async () => {
    if (!actual || !user || !valido) return;
    setEnviando(true);
    try {
      const r = await validarRecepcion({
        compraId: actual.id,
        usuarioId: user.id,
        lineas: filas.map((f) => ({ detalleId: f.detalleId, cantidadRecibida: Number(f.recibida), numeroLote: f.lote, fechaVencimiento: f.vence || null })),
      });

      if (r.success) {
        toast.success(
          `Recepción validada: ${r.data.lineasRecibidas} producto(s) ingresaron al almacén${r.data.conDiferencia ? ` (${r.data.conDiferencia} con diferencia, anotada)` : ""}.`,
        );
        setActual(null);
        await cargar();
      } else {
        toast.error(r.error);
        await cargar();
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-5">
      <Breadcrumbs items={[{ label: "Compras" }, { label: "Recepciones" }]} />

      <div className="rounded-2xl bg-white border border-default-200 shadow-sm p-5 sm:p-6">
        <h1 className="text-2xl font-bold leading-tight">Recepciones</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Compras confirmadas que esperan llegar al almacén. Verifica lo que llegó contra lo pedido, completa el lote y el
          vencimiento y valida: <b>recién ahí entra al stock</b>.
        </p>
        {!puedeValidar && (
          <p className="mt-3 text-xs rounded-lg bg-amber-50 text-amber-800 px-3 py-2">
            Solo el Gestor de Almacén y el Administrador validan la recepción; tú puedes ver qué compras esperan.
          </p>
        )}
      </div>

      {cargando ? (
        <div className="flex justify-center py-16">
          <Spinner label="Cargando recepciones…" size="lg" />
        </div>
      ) : compras.length === 0 ? (
        <Card className="border border-default-200 shadow-sm">
          <CardBody className="p-10 text-center">
            <Icon className="mx-auto text-green-400 mb-3" height="56" icon="heroicons:check-circle" width="56" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No hay compras por recibir</h3>
            <p className="text-gray-500 text-sm">Todo lo que se confirmó ya ingresó al almacén.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {compras.map((c) => (
            <div key={c.id} className="rounded-2xl border border-default-200 bg-white shadow-sm p-4 sm:p-5">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-3 md:w-72 shrink-0">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Icon height="22" icon="heroicons:truck" width="22" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{c.numeroCompra}</p>
                    <p className="text-xs text-gray-500">Confirmada el {formatShortDate(c.fecha)}</p>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Proveedor</p>
                    <p className="font-medium">{c.proveedor}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Productos</p>
                    <Chip size="sm" variant="flat">
                      {c.lineas.length}
                    </Chip>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Total pedido</p>
                    <p className="font-bold text-primary-700">Bs. {c.total.toFixed(2)}</p>
                  </div>
                </div>
                <Button
                  className="md:w-auto w-full shrink-0"
                  color="success"
                  isDisabled={!puedeValidar}
                  size="sm"
                  startContent={<Icon height="18" icon="heroicons:clipboard-document-check" width="18" />}
                  variant="flat"
                  onPress={() => abrir(c)}
                >
                  Validar recepción
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal backdrop="blur" isOpen={actual !== null} radius="lg" scrollBehavior="inside" size="5xl" onClose={() => !enviando && setActual(null)}>
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1 pt-6">
                <h2 className="text-lg font-semibold leading-tight">Validar recepción · {actual?.numeroCompra}</h2>
                <p className="text-sm text-zinc-500 font-normal">
                  {actual?.proveedor} · Escribe lo que <b>realmente llegó</b> (no puede ser más de lo pedido).
                </p>
              </ModalHeader>
              <ModalBody>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-default-200">
                        <th className="py-2 pr-3 font-medium">Producto</th>
                        <th className="py-2 pr-3 font-medium w-28">Pedido</th>
                        <th className="py-2 pr-3 font-medium w-32">Recibido</th>
                        <th className="py-2 pr-3 font-medium w-44">Lote</th>
                        <th className="py-2 pr-3 font-medium w-40">Vence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-default-100 align-top">
                      {actual?.lineas.map((l, i) => {
                        const d = detalle[i];
                        const f = filas[i];

                        if (!d || !f) return null;

                        return (
                          <tr key={l.detalleId}>
                            <td className="py-2.5 pr-3">
                              <p className="font-medium">{l.producto}</p>
                              {d.problemas.length > 0 && <p className="text-xs text-red-600 mt-0.5">{d.problemas.join(" · ")}</p>}
                              {d.problemas.length === 0 && d.falta > 0.0001 && (
                                <p className="text-xs text-amber-700 mt-0.5">
                                  {d.n === 0 ? "No llegó" : `Faltan ${cant(d.falta)}`}: la compra se ajusta a lo recibido
                                </p>
                              )}
                            </td>
                            <td className="py-2.5 pr-3 whitespace-nowrap">
                              {cant(l.cantidadPedida)} {l.unidad}
                            </td>
                            <td className="py-2.5 pr-3">
                              <input
                                aria-label={`Recibido de ${l.producto}`}
                                className={`${CAMPO} ${d.problemas.length ? "border-red-400" : d.falta > 0.0001 ? "border-amber-400" : "border-default-200"}`}
                                inputMode="decimal"
                                min="0"
                                step="any"
                                type="number"
                                value={f.recibida}
                                onChange={(e) => cambiar(i, { recibida: e.target.value })}
                              />
                            </td>
                            <td className="py-2.5 pr-3">
                              <input aria-label={`Lote de ${l.producto}`} className={`${CAMPO} border-default-200`} value={f.lote} onChange={(e) => cambiar(i, { lote: e.target.value })} />
                            </td>
                            <td className="py-2.5 pr-3">
                              <input aria-label={`Vencimiento de ${l.producto}`} className={`${CAMPO} border-default-200`} type="date" value={f.vence} onChange={(e) => cambiar(i, { vence: e.target.value })} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {conDiferencia > 0 && (
                  <p className="text-xs rounded-lg bg-amber-50 text-amber-800 px-3 py-2">
                    {conDiferencia} producto(s) con diferencia. Al validar, la compra se ajusta a lo que realmente llegó y la diferencia queda anotada en el historial.
                  </p>
                )}
              </ModalBody>
              <ModalFooter>
                <Button isDisabled={enviando} radius="lg" variant="flat" onPress={() => setActual(null)}>
                  Cancelar
                </Button>
                <Button color="success" isDisabled={!valido} isLoading={enviando} radius="lg" onPress={confirmar}>
                  Validar recepción
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
