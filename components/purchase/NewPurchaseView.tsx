"use client";

import { Autocomplete, AutocompleteItem, Button, Chip, Input } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";

import { useAuth } from "@/app/context/AuthContext";
import { createPurchaseAction } from "@/actions/purchase/create-purchase-action";
import { getSolicitudParaCompra } from "@/actions/purchase/purchase-request-action";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { ProductoConUnidades, PurchaseDetailItem, UnidadProducto } from "@/src/schema/SchemaPurchase";
import { generatePurchaseNumber } from "@/src/store/purchaseSlice";
import { useAppStore } from "@/src/store/useAppStore";
import { hoyBolivia } from "@/src/utils/date";
import { bs } from "@/src/utils/report-format";

type Solicitud = { id: number; numero: string };

/** Desde cuántas líneas aparece el buscador dentro de la lista */
const BUSCAR_DESDE = 8;

const CELDA =
  "w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-200";

function loteAutomatico(nombre: string, i: number) {
  return `LOTE-${nombre.replace(/[^A-Za-z0-9]/g, "").substring(0, 3).toUpperCase()}-${(Date.now() + i).toString().slice(-6)}`;
}

function nuevaLinea(p: ProductoConUnidades, i: number): PurchaseDetailItem {
  const unidad = p.unidades.find((u) => u.esUnidadBase) ?? p.unidades[0];

  return {
    id: `${p.id}-${Date.now()}-${i}`,
    productoId: p.id,
    productoNombre: p.nombre,
    unidadMedidaId: unidad?.unidadId ?? 0,
    unidadNombre: unidad?.nombre ?? "",
    unidadAbreviatura: unidad?.abreviatura ?? "",
    factorConversion: unidad?.factor ?? 1,
    cantidadComprada: 0,
    precioUnitario: 0,
    subtotal: 0,
    descuento: 0,
    total: 0,
    numeroLote: loteAutomatico(p.nombre, i),
    fechaVencimiento: undefined,
  };
}

/** Lo que le falta a una línea para poder confirmar la compra */
function faltantes(l: PurchaseDetailItem): string[] {
  const f: string[] = [];

  if (!(l.cantidadComprada > 0)) f.push("cantidad");
  if (!(l.precioUnitario > 0)) f.push("precio");
  if (!l.numeroLote.trim()) f.push("lote");
  if (l.descuento > l.subtotal) f.push("descuento mayor al subtotal");

  return f;
}

const aTexto = (n: number) => (n ? String(n) : "");
const aNumero = (v: string) => Math.max(Number(v) || 0, 0);

export default function NewPurchaseView() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const solicitudParam = Number(params.get("solicitud")) || null;

  const proveedores = useAppStore((s) => s.proveedores);
  const fetchProveedores = useAppStore((s) => s.fetchProveedores);
  const fetchProductosBySupplier = useAppStore((s) => s.fetchProductosBySupplier);
  const productosProveedor = useAppStore((s) => s.productosProveedor);
  const clearProductos = useAppStore((s) => s.clearProductos);
  const selectedSupplierId = useAppStore((s) => s.selectedSupplierId);
  const setSelectedSupplierId = useAppStore((s) => s.setSelectedSupplierId);
  const detailPurchase = useAppStore((s) => s.detailPurchase);
  const setDetailPurchase = useAppStore((s) => s.setDetailPurchase);
  const clearDetailPurchase = useAppStore((s) => s.clearDetailPurchase);
  const createPurchase = useAppStore((s) => s.createPurchase);
  const calculatePurchaseTotals = useAppStore((s) => s.calculatePurchaseTotals);

  // El número y la fecha dependen de la hora: se generan en el navegador para no desincronizar el render del servidor
  const [numeroCompra, setNumeroCompra] = useState("");
  const [fecha, setFecha] = useState("");
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [reinicio, setReinicio] = useState(0); // fuerza a vaciar el buscador después de agregar
  const [filtroLista, setFiltroLista] = useState("");
  const [foco, setFoco] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNumeroCompra(generatePurchaseNumber());
    setFecha(new Date().toLocaleDateString("es-BO"));
  }, []);

  // Al entrar se parte de cero (el estado global recuerda la compra anterior); si viene de una solicitud, se llena sola
  useEffect(() => {
    let cancelado = false;

    (async () => {
      clearDetailPurchase();
      clearProductos();
      setSelectedSupplierId(null);
      await fetchProveedores();

      if (solicitudParam) {
        const s = await getSolicitudParaCompra(solicitudParam);

        if (cancelado) return;
        if (!s) {
          toast.info("Esa solicitud ya no está pendiente.");
        } else {
          setSelectedSupplierId(s.proveedorID);
          await fetchProductosBySupplier(s.proveedorID);
          const productos = useAppStore.getState().productosProveedor;

          setDetailPurchase(productos.filter((p) => s.productoIDs.includes(p.id)).map((p, i) => nuevaLinea(p, i)));
          setSolicitud({ id: s.id, numero: s.numero });
        }
      }
      if (!cancelado) setCargando(false);
    })();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitudParam]);

  // Después de agregar un producto, el cursor va directo a su cantidad
  useEffect(() => {
    if (!foco) return;
    const el = document.querySelectorAll<HTMLInputElement>(`[data-cantidad="${foco}"]`);
    const visible = Array.from(el).find((e) => e.offsetParent !== null);

    visible?.focus();
    visible?.scrollIntoView({ block: "center", behavior: "smooth" });
    setFoco(null);
  }, [foco, detailPurchase]);

  const proveedor = proveedores.find((p) => p.id === selectedSupplierId);
  const totals = calculatePurchaseTotals();
  const lineasInvalidas = useMemo(() => detailPurchase.filter((l) => faltantes(l).length > 0).length, [detailPurchase]);
  const disponibles = useMemo(
    () => productosProveedor.filter((p) => !detailPurchase.some((l) => l.productoId === p.id)),
    [productosProveedor, detailPurchase],
  );
  const visibles = useMemo(() => {
    const q = filtroLista.trim().toLowerCase();

    return q ? detailPurchase.filter((l) => l.productoNombre.toLowerCase().includes(q)) : detailPurchase;
  }, [detailPurchase, filtroLista]);
  const puedeConfirmar = !!selectedSupplierId && detailPurchase.length > 0 && lineasInvalidas === 0 && !enviando;

  const cambiarProveedor = async (id: string) => {
    setDetailPurchase([]);
    setSolicitud(null);
    if (!id) {
      setSelectedSupplierId(null);
      clearProductos();

      return;
    }
    setSelectedSupplierId(Number(id));
    await fetchProductosBySupplier(Number(id));
  };

  const agregarProducto = (id: string | number | null) => {
    if (id === null) return;
    const p = productosProveedor.find((x) => x.id === Number(id));

    if (!p) return;
    const linea = nuevaLinea(p, detailPurchase.length);

    setDetailPurchase([...detailPurchase, linea]);
    setFiltroLista("");
    setBusquedaProducto("");
    setReinicio((r) => r + 1);
    setFoco(linea.id);
  };

  const actualizar = (id: string, cambios: Partial<PurchaseDetailItem>) => {
    setDetailPurchase(
      detailPurchase.map((l) => {
        if (l.id !== id) return l;
        const u = { ...l, ...cambios };

        u.subtotal = u.cantidadComprada * u.precioUnitario;
        u.total = Math.max(0, u.subtotal - u.descuento);

        return u;
      }),
    );
  };

  const cambiarVencimiento = (id: string, valor: string) => {
    if (valor && valor < hoyBolivia()) {
      toast.warning("Esa fecha de vencimiento ya pasó: el lote no se podrá sacar al estante ni vender.");
    }
    actualizar(id, { fechaVencimiento: valor ? new Date(valor) : undefined });
  };

  const unidadesDe = (l: PurchaseDetailItem): UnidadProducto[] =>
    productosProveedor.find((x) => x.id === l.productoId)?.unidades ?? [];

  const cambiarUnidad = (l: PurchaseDetailItem, unidadId: string) => {
    const u = unidadesDe(l).find((x) => x.unidadId === Number(unidadId));

    if (u) {
      actualizar(l.id, { unidadMedidaId: u.unidadId, unidadNombre: u.nombre, unidadAbreviatura: u.abreviatura ?? "", factorConversion: u.factor });
    }
  };

  const quitar = (id: string) => setDetailPurchase(detailPurchase.filter((x) => x.id !== id));

  const confirmar = async () => {
    if (!puedeConfirmar) return;
    setEnviando(true);
    try {
      const datos = await createPurchase(user?.id || 0);

      if (!datos) throw new Error("No se pudieron preparar los datos");
      const r = await createPurchaseAction({ ...datos, numeroCompra, solicitudID: solicitud?.id });

      if (!r.success) throw new Error(r.error || "Error al crear la compra");
      toast.success("Compra confirmada. Queda por recibir: Almacén validará lo que llegue.");
      clearDetailPurchase();
      setSelectedSupplierId(null);
      clearProductos();
      router.push("/Dashboard/Purchase/List/");
    } catch (error) {
      console.error("Error al crear la compra:", error);
      toast.error("No se pudo crear la compra. Intenta nuevamente.");
    } finally {
      setEnviando(false);
    }
  };

  const nombreUnidad = (u: UnidadProducto) => `${u.nombre}${u.factor !== 1 ? ` (${u.factor} unid.)` : ""}`;

  return (
    <div className="p-4 md:p-8 space-y-5">
      <Breadcrumbs items={[{ label: "Compras", href: "/Dashboard/Purchase/List" }, { label: "Nueva compra" }]} />

      {/* Cabecera */}
      <div className="rounded-2xl bg-white border border-default-200 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-tight">Nueva compra</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Elige el proveedor, busca los productos, completa cantidad y precio y confirma el pedido. El stock entra al almacén cuando Almacén valide lo que reciba.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              className="w-full md:w-56"
              label="N° de compra"
              size="sm"
              value={numeroCompra}
              variant="bordered"
              onValueChange={setNumeroCompra}
            />
            {fecha && (
              <Chip className="shrink-0" startContent={<Icon height="14" icon="heroicons:calendar" width="14" />} variant="flat">
                {fecha}
              </Chip>
            )}
          </div>
        </div>

        {solicitud && (
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-secondary-50 text-secondary-900 text-sm px-4 py-3">
            <Icon className="mt-0.5 shrink-0 text-secondary-600" height="18" icon="heroicons:clipboard-document-list" width="18" />
            <span>
              Esta compra viene de la solicitud <b>{solicitud.numero}</b>: los productos ya están cargados. Solo completa la
              cantidad y el precio de cada uno.
            </span>
          </div>
        )}

        <div className="mt-5 pt-5 border-t border-default-200 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <Autocomplete
            defaultItems={proveedores}
            isDisabled={cargando}
            label="Proveedor"
            placeholder="Busca o elige un proveedor"
            selectedKey={selectedSupplierId ? selectedSupplierId.toString() : null}
            variant="bordered"
            onSelectionChange={(k) => cambiarProveedor(k ? String(k) : "")}
          >
            {(p) => <AutocompleteItem key={p.id.toString()}>{p.nombre}</AutocompleteItem>}
          </Autocomplete>
          {proveedor && (
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600 lg:pt-3">
              {proveedor.celular && (
                <span className="flex items-center gap-1.5">
                  <Icon height="16" icon="heroicons:phone" width="16" /> {proveedor.celular}
                </span>
              )}
              {proveedor.correo && (
                <span className="flex items-center gap-1.5 break-all">
                  <Icon height="16" icon="heroicons:envelope" width="16" /> {proveedor.correo}
                </span>
              )}
              {proveedor.direccion && (
                <span className="flex items-center gap-1.5">
                  <Icon height="16" icon="heroicons:map-pin" width="16" /> {proveedor.direccion}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Líneas de la compra */}
      <div className="rounded-2xl bg-white border border-default-200 shadow-sm">
        <div className="p-4 sm:p-5 border-b border-default-200 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base">Productos de la compra</h2>
            <p className="text-xs text-gray-500">
              {selectedSupplierId
                ? `${detailPurchase.length} ${detailPurchase.length === 1 ? "producto" : "productos"} · ${disponibles.length} más de este proveedor para agregar`
                : "Primero elige un proveedor"}
            </p>
          </div>

          {selectedSupplierId && detailPurchase.length >= BUSCAR_DESDE && (
            <Input
              className="lg:w-64"
              isClearable
              placeholder="Buscar en la lista"
              size="sm"
              startContent={<Icon height="16" icon="heroicons:magnifying-glass" width="16" />}
              value={filtroLista}
              variant="bordered"
              onClear={() => setFiltroLista("")}
              onValueChange={setFiltroLista}
            />
          )}

          {selectedSupplierId && (
            <Autocomplete
              key={reinicio}
              className="lg:w-80"
              defaultItems={disponibles}
              inputValue={busquedaProducto}
              isDisabled={disponibles.length === 0}
              label="Agregar producto"
              placeholder={disponibles.length ? "Escribe para buscar…" : "Ya agregaste todos"}
              size="sm"
              startContent={<Icon height="16" icon="heroicons:plus-circle" width="16" />}
              variant="bordered"
              onInputChange={setBusquedaProducto}
              onSelectionChange={(k) => agregarProducto(k)}
            >
              {(p) => <AutocompleteItem key={p.id.toString()}>{p.nombre}</AutocompleteItem>}
            </Autocomplete>
          )}
        </div>

        {detailPurchase.length === 0 ? (
          <div className="p-10 text-center">
            <Icon className="mx-auto text-gray-300" height="40" icon="heroicons:shopping-bag" width="40" />
            <p className="text-sm text-gray-500 mt-2">
              {selectedSupplierId
                ? "Busca un producto arriba y agrégalo a la compra."
                : "Elige un proveedor para ver sus productos."}
            </p>
          </div>
        ) : visibles.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">Ningún producto de la lista coincide con “{filtroLista}”.</div>
        ) : (
          <>
            {/* Pantallas grandes: tabla editable, como en Odoo */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-default-200">
                    <th className="px-4 py-2.5 font-medium">Producto</th>
                    <th className="px-2 py-2.5 font-medium w-36">Se compra por</th>
                    <th className="px-2 py-2.5 font-medium w-24">Cantidad</th>
                    <th className="px-2 py-2.5 font-medium w-28">Precio unit.</th>
                    <th className="px-2 py-2.5 font-medium w-24">Descuento</th>
                    <th className="px-2 py-2.5 font-medium w-28 text-right">Total</th>
                    <th className="px-2 py-2.5 font-medium w-40">Lote</th>
                    <th className="px-2 py-2.5 font-medium w-36">Vence</th>
                    <th className="px-2 py-2.5 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-default-100">
                  {visibles.map((l) => {
                    const falta = faltantes(l);
                    const malo = (campo: string) => (falta.includes(campo) ? "border-amber-400" : "border-default-200");

                    return (
                      <tr key={l.id} className="align-middle hover:bg-default-50/60">
                        <td className="px-4 py-2">
                          <p className="font-medium">{l.productoNombre}</p>
                          {l.factorConversion !== 1 && l.cantidadComprada > 0 && (
                            <p className="text-[11px] text-gray-500">
                              = {(l.cantidadComprada * l.factorConversion).toLocaleString("en-US", { maximumFractionDigits: 2 })} unid. base
                            </p>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <select
                            aria-label={`Unidad de ${l.productoNombre}`}
                            className={`${CELDA} border-default-200`}
                            value={l.unidadMedidaId}
                            onChange={(e) => cambiarUnidad(l, e.target.value)}
                          >
                            {unidadesDe(l).map((u) => (
                              <option key={u.unidadId} value={u.unidadId}>
                                {nombreUnidad(u)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            aria-label={`Cantidad de ${l.productoNombre}`}
                            className={`${CELDA} ${malo("cantidad")}`}
                            data-cantidad={l.id}
                            inputMode="decimal"
                            min="0"
                            placeholder="0"
                            step="any"
                            type="number"
                            value={aTexto(l.cantidadComprada)}
                            onChange={(e) => actualizar(l.id, { cantidadComprada: aNumero(e.target.value) })}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            aria-label={`Precio unitario de ${l.productoNombre}`}
                            className={`${CELDA} ${malo("precio")}`}
                            inputMode="decimal"
                            min="0"
                            placeholder="0.00"
                            step="any"
                            type="number"
                            value={aTexto(l.precioUnitario)}
                            onChange={(e) => actualizar(l.id, { precioUnitario: aNumero(e.target.value) })}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            aria-label={`Descuento de ${l.productoNombre}`}
                            className={`${CELDA} ${falta.includes("descuento mayor al subtotal") ? "border-amber-400" : "border-default-200"}`}
                            inputMode="decimal"
                            min="0"
                            placeholder="0.00"
                            step="any"
                            type="number"
                            value={aTexto(l.descuento)}
                            onChange={(e) => actualizar(l.id, { descuento: aNumero(e.target.value) })}
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-semibold tabular-nums">{bs(l.total)}</td>
                        <td className="px-2 py-2">
                          <input
                            aria-label={`Lote de ${l.productoNombre}`}
                            className={`${CELDA} ${malo("lote")}`}
                            value={l.numeroLote}
                            onChange={(e) => actualizar(l.id, { numeroLote: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            aria-label={`Vencimiento de ${l.productoNombre}`}
                            className={`${CELDA} border-default-200`}
                            type="date"
                            value={l.fechaVencimiento ? l.fechaVencimiento.toISOString().split("T")[0] : ""}
                            onChange={(e) => cambiarVencimiento(l.id, e.target.value)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <button
                            aria-label={`Quitar ${l.productoNombre}`}
                            className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                            type="button"
                            onClick={() => quitar(l.id)}
                          >
                            <Icon height="18" icon="heroicons:trash" width="18" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Celulares y tablets: una tarjeta por producto */}
            <ul className="xl:hidden divide-y divide-default-100">
              {visibles.map((l) => {
                const falta = faltantes(l);
                const malo = (campo: string) => (falta.includes(campo) ? "border-amber-400" : "border-default-200");

                return (
                  <li key={l.id} className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{l.productoNombre}</p>
                        {falta.length > 0 && <p className="text-xs text-amber-700 mt-0.5">Falta: {falta.join(", ")}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="text-base font-bold tabular-nums">{bs(l.total)}</p>
                        <button
                          aria-label={`Quitar ${l.productoNombre}`}
                          className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                          type="button"
                          onClick={() => quitar(l.id)}
                        >
                          <Icon height="18" icon="heroicons:trash" width="18" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      <label className="col-span-2 sm:col-span-1 text-xs text-gray-500">
                        Se compra por
                        <select
                          className={`${CELDA} border-default-200 mt-1 text-gray-900`}
                          value={l.unidadMedidaId}
                          onChange={(e) => cambiarUnidad(l, e.target.value)}
                        >
                          {unidadesDe(l).map((u) => (
                            <option key={u.unidadId} value={u.unidadId}>
                              {nombreUnidad(u)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-gray-500">
                        Cantidad
                        <input
                          className={`${CELDA} ${malo("cantidad")} mt-1 text-gray-900`}
                          data-cantidad={l.id}
                          inputMode="decimal"
                          min="0"
                          placeholder="0"
                          step="any"
                          type="number"
                          value={aTexto(l.cantidadComprada)}
                          onChange={(e) => actualizar(l.id, { cantidadComprada: aNumero(e.target.value) })}
                        />
                      </label>
                      <label className="text-xs text-gray-500">
                        Precio unit. (Bs.)
                        <input
                          className={`${CELDA} ${malo("precio")} mt-1 text-gray-900`}
                          inputMode="decimal"
                          min="0"
                          placeholder="0.00"
                          step="any"
                          type="number"
                          value={aTexto(l.precioUnitario)}
                          onChange={(e) => actualizar(l.id, { precioUnitario: aNumero(e.target.value) })}
                        />
                      </label>
                      <label className="text-xs text-gray-500">
                        Descuento (Bs.)
                        <input
                          className={`${CELDA} border-default-200 mt-1 text-gray-900`}
                          inputMode="decimal"
                          min="0"
                          placeholder="0.00"
                          step="any"
                          type="number"
                          value={aTexto(l.descuento)}
                          onChange={(e) => actualizar(l.id, { descuento: aNumero(e.target.value) })}
                        />
                      </label>
                      <label className="col-span-2 text-xs text-gray-500">
                        N° de lote
                        <input
                          className={`${CELDA} ${malo("lote")} mt-1 text-gray-900`}
                          value={l.numeroLote}
                          onChange={(e) => actualizar(l.id, { numeroLote: e.target.value })}
                        />
                      </label>
                      <label className="col-span-2 text-xs text-gray-500">
                        Vence (opcional)
                        <input
                          className={`${CELDA} border-default-200 mt-1 text-gray-900`}
                          type="date"
                          value={l.fechaVencimiento ? l.fechaVencimiento.toISOString().split("T")[0] : ""}
                          onChange={(e) => cambiarVencimiento(l.id, e.target.value)}
                        />
                      </label>
                    </div>

                    {l.factorConversion !== 1 && l.cantidadComprada > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Equivale a {(l.cantidadComprada * l.factorConversion).toLocaleString("en-US", { maximumFractionDigits: 2 })}{" "}
                        unidades base en el almacén.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <div ref={finRef} />
      </div>

      {/* Totales y confirmación: quedan a la vista al bajar por la lista */}
      <div className="sticky bottom-3 z-20 rounded-2xl bg-white/95 backdrop-blur border border-default-200 shadow-lg p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm flex-1">
            <div className="flex gap-1.5">
              <dt className="text-gray-500">Productos</dt>
              <dd className="font-semibold">{detailPurchase.length}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-gray-500">Subtotal</dt>
              <dd className="font-semibold tabular-nums">{bs(totals.subtotal)}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-gray-500">Descuento</dt>
              <dd className="font-semibold tabular-nums text-red-600">− {bs(totals.totalDescuento)}</dd>
            </div>
            <div className="flex gap-2 items-baseline">
              <dt className="text-gray-500">Total</dt>
              <dd className="text-xl font-bold tabular-nums text-primary-600">{bs(totals.total)}</dd>
            </div>
          </dl>

          {!puedeConfirmar && !enviando && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              {!selectedSupplierId
                ? "Elige un proveedor para empezar."
                : detailPurchase.length === 0
                  ? "Agrega al menos un producto."
                  : `Completa cantidad y precio en ${lineasInvalidas} ${lineasInvalidas === 1 ? "producto" : "productos"}.`}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              className="flex-1 lg:flex-none"
              isDisabled={enviando || detailPurchase.length === 0}
              variant="bordered"
              onPress={() => setDetailPurchase([])}
            >
              Vaciar lista
            </Button>
            <Button className="flex-1 lg:flex-none" color="primary" isDisabled={!puedeConfirmar} isLoading={enviando} onPress={confirmar}>
              Confirmar compra
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
