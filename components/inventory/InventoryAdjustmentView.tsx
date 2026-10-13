"use client";
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
  Textarea,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import {
  ajustarInventario,
  EstanteAjuste,
  getProductosParaAjuste,
  getUbicacionesAjuste,
  LoteAjuste,
  ProductoAjuste,
  UbicacionesAjuste,
} from "@/actions/inventory/adjust-inventory-action";
import { useAuth } from "@/app/context/AuthContext";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { MOTIVOS_AJUSTE } from "@/src/lib/stock-almacen";
import { getDiasParaVencer, getSeveridad, formatVencimiento } from "@/src/utils/expiry";

const cant = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const redondear = (n: number) => Math.round(n * 100) / 100;

/** Lo que se está ajustando ahora mismo (abre el modal) */
type Objetivo =
  | { ubicacion: "almacen"; lote: LoteAjuste; unidad: string }
  | { ubicacion: "estante"; stock: EstanteAjuste; unidad: string };

function ChipVence({ fecha }: { fecha: string | null }) {
  if (!fecha) return <span className="text-xs text-gray-400">Sin vencimiento</span>;
  const dias = getDiasParaVencer(fecha);
  const sev = getSeveridad(dias);

  return (
    <Chip color={sev ?? "default"} size="sm" variant="flat">
      {formatVencimiento(dias)}
    </Chip>
  );
}

export default function InventoryAdjustmentView() {
  const { user } = useAuth();
  const [productos, setProductos] = useState<ProductoAjuste[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [productoId, setProductoId] = useState<number | null>(null);
  const [ubicaciones, setUbicaciones] = useState<UbicacionesAjuste | null>(null);
  const [cargandoUbicaciones, setCargandoUbicaciones] = useState(false);

  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const [real, setReal] = useState("");
  const [motivo, setMotivo] = useState("");
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargarProductos = useCallback(async () => {
    const r = await getProductosParaAjuste();

    if (r.success) setProductos(r.data);
    else toast.error(r.error || "No se pudieron cargar los productos");
    setCargandoProductos(false);
  }, []);

  const cargarUbicaciones = useCallback(async (id: number) => {
    setCargandoUbicaciones(true);
    const r = await getUbicacionesAjuste(id);

    if (r.success && r.data) setUbicaciones(r.data);
    else {
      setUbicaciones(null);
      toast.error(r.error || "No se pudo cargar el stock del producto");
    }
    setCargandoUbicaciones(false);
  }, []);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  useEffect(() => {
    if (productoId === null) {
      setUbicaciones(null);

      return;
    }
    cargarUbicaciones(productoId);
  }, [productoId, cargarUbicaciones]);

  const actual = objetivo ? (objetivo.ubicacion === "almacen" ? objetivo.lote.enAlmacen : objetivo.stock.cantidad) : 0;
  const unidad = objetivo ? (objetivo.ubicacion === "almacen" ? objetivo.unidad : objetivo.stock.unidad) : "";
  const vencido = objetivo ? (objetivo.ubicacion === "almacen" ? objetivo.lote.vencido : objetivo.stock.vencido) : false;
  const realNum = real.trim() === "" ? NaN : Number(real);
  const diferencia = Number.isFinite(realNum) ? redondear(realNum - actual) : NaN;
  const valido =
    Number.isFinite(diferencia) &&
    Math.abs(diferencia) >= 0.005 &&
    realNum >= 0 &&
    !(vencido && diferencia > 0) &&
    motivo !== "" &&
    comentario.trim().length >= 3;

  const abrir = (o: Objetivo) => {
    setObjetivo(o);
    setReal(String(o.ubicacion === "almacen" ? o.lote.enAlmacen : o.stock.cantidad));
    setMotivo("");
    setComentario("");
  };

  const cerrar = () => {
    if (!enviando) setObjetivo(null);
  };

  const confirmar = async () => {
    if (!objetivo || !user || !valido) return;
    setEnviando(true);
    try {
      const r = await ajustarInventario({
        ubicacion: objetivo.ubicacion,
        referenciaId: objetivo.ubicacion === "almacen" ? objetivo.lote.loteId : objetivo.stock.stockVentaId,
        cantidadReal: realNum,
        cantidadVista: actual,
        motivo,
        comentario,
        usuarioId: user.id,
      });

      if (r.success) {
        toast.success(
          `Ajuste registrado: ${r.data.diferencia > 0 ? "+" : ""}${cant(r.data.diferencia)} ${unidad}. Quedó en el historial.`,
        );
        setObjetivo(null);
        await Promise.all([cargarProductos(), productoId !== null ? cargarUbicaciones(productoId) : Promise.resolve()]);
      } else {
        toast.error(r.error);
        // Si cambió mientras ajustaba, se refresca para ver el valor actual
        if (productoId !== null) cargarUbicaciones(productoId);
      }
    } finally {
      setEnviando(false);
    }
  };

  const seleccionado = useMemo(() => productos.find((p) => p.id === productoId), [productos, productoId]);

  return (
    <div className="p-4 md:p-8 space-y-5">
      <Breadcrumbs items={[{ label: "Inventario" }, { label: "Ajustes" }]} />

      <div className="rounded-2xl bg-white border border-default-200 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-tight">Ajuste de inventario</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Corrige el stock cuando el conteo físico no coincide con el sistema (merma, daño, pérdida, error de
              conteo…). Cada ajuste queda en el historial con motivo, usuario y fecha.
            </p>
          </div>
          <Button as={Link} href="/Dashboard/Inventory/Movements" startContent={<Icon icon="heroicons:clock" width="18" />} variant="bordered">
            Ver historial
          </Button>
        </div>

        <div className="mt-5 pt-5 border-t border-default-200">
          <Autocomplete
            isDisabled={cargandoProductos}
            label="Producto"
            placeholder={cargandoProductos ? "Cargando…" : "Busca el producto que vas a ajustar"}
            selectedKey={productoId !== null ? String(productoId) : null}
            variant="bordered"
            onSelectionChange={(k) => setProductoId(k ? Number(k) : null)}
          >
            {productos.map((p) => (
              <AutocompleteItem key={String(p.id)} textValue={p.nombre}>
                <div className="flex justify-between gap-3">
                  <span>{p.nombre}</span>
                  <span className="text-xs text-gray-500">
                    Almacén {cant(p.almacen)} · Estante {cant(p.estante)} {p.unidadBase}
                  </span>
                </div>
              </AutocompleteItem>
            ))}
          </Autocomplete>
        </div>
      </div>

      {productoId === null ? (
        <Card className="border border-default-200 shadow-sm">
          <CardBody className="p-10 text-center">
            <Icon className="mx-auto text-gray-300 mb-3" height="56" icon="heroicons:adjustments-horizontal" width="56" />
            <p className="text-gray-500 text-sm">Elige un producto para ver dónde está y ajustar su cantidad.</p>
          </CardBody>
        </Card>
      ) : cargandoUbicaciones && !ubicaciones ? (
        <div className="flex justify-center py-16">
          <Spinner label="Cargando stock…" size="lg" />
        </div>
      ) : ubicaciones ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* ALMACÉN */}
          <div className="rounded-2xl bg-white border border-default-200 shadow-sm">
            <div className="p-4 sm:p-5 border-b border-default-200">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Icon className="text-primary-600" height="20" icon="heroicons:archive-box" width="20" />
                En el almacén
              </h2>
              <p className="text-xs text-gray-500">
                Un renglón por lote. Cantidades en <b>{ubicaciones.producto.unidadBase}</b> (unidad base).
              </p>
            </div>
            {ubicaciones.lotes.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-500">Este producto no tiene lotes.</p>
            ) : (
              <ul className="divide-y divide-default-100">
                {ubicaciones.lotes.map((l) => (
                  <li key={l.loteId} className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">Lote {l.numeroLote}</p>
                      <div className="mt-1">
                        <ChipVence fecha={l.fechaVencimiento} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold leading-tight">
                        {cant(l.enAlmacen)} <span className="text-xs font-semibold text-gray-500">{ubicaciones.producto.unidadBase}</span>
                      </p>
                    </div>
                    <Button
                      color="primary"
                      size="sm"
                      variant="flat"
                      onPress={() => abrir({ ubicacion: "almacen", lote: l, unidad: ubicaciones.producto.unidadBase })}
                    >
                      Ajustar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ESTANTE */}
          <div className="rounded-2xl bg-white border border-default-200 shadow-sm">
            <div className="p-4 sm:p-5 border-b border-default-200">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Icon className="text-secondary-600" height="20" icon="heroicons:squares-2x2" width="20" />
                En el estante (punto de venta)
              </h2>
              <p className="text-xs text-gray-500">Cantidades en la unidad con la que se vende cada renglón.</p>
            </div>
            {ubicaciones.estante.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-500">No hay este producto en el estante.</p>
            ) : (
              <ul className="divide-y divide-default-100">
                {ubicaciones.estante.map((s) => (
                  <li key={s.stockVentaId} className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">
                        {s.unidad} · Bs. {s.precio.toFixed(2)}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        {s.lote && <span>Lote {s.lote}</span>}
                        <ChipVence fecha={s.fechaVencimiento} />
                        {s.codigosActivos > 0 && (
                          <Chip size="sm" variant="flat">
                            {s.codigosActivos} código(s)
                          </Chip>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold leading-tight">
                        {cant(s.cantidad)} <span className="text-xs font-semibold text-gray-500">{s.unidad}</span>
                      </p>
                    </div>
                    <Button color="secondary" size="sm" variant="flat" onPress={() => abrir({ ubicacion: "estante", stock: s, unidad: s.unidad })}>
                      Ajustar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {seleccionado && (
        <p className="text-xs text-gray-400">
          {seleccionado.nombre}: {cant(seleccionado.almacen)} en almacén y {cant(seleccionado.estante)} en estante (sin contar lo vencido).
        </p>
      )}

      {/* MODAL */}
      <Modal backdrop="blur" isOpen={objetivo !== null} radius="lg" scrollBehavior="inside" size="lg" onClose={cerrar}>
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1 pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-amber-100 text-amber-600 shrink-0">
                    <Icon height="24" icon="heroicons:adjustments-horizontal" width="24" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold leading-tight">
                      Ajustar {objetivo?.ubicacion === "almacen" ? "almacén" : "estante"}
                    </h2>
                    <p className="text-sm text-zinc-500 font-normal">
                      {ubicaciones?.producto.nombre}
                      {objetivo?.ubicacion === "almacen" ? ` · Lote ${objetivo.lote.numeroLote}` : ` · ${unidad}`}
                    </p>
                  </div>
                </div>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 text-sm">
                    <span className="text-gray-600">El sistema tiene</span>
                    <b className="text-base">
                      {cant(actual)} {unidad}
                    </b>
                  </div>

                  <Input
                    autoFocus
                    description="Lo que realmente contaste. Si es 0, se da de baja todo."
                    label="Cantidad real contada"
                    min="0"
                    step="0.01"
                    type="number"
                    value={real}
                    variant="bordered"
                    endContent={<span className="text-xs text-gray-500">{unidad}</span>}
                    onValueChange={setReal}
                  />

                  <div
                    className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                      !Number.isFinite(diferencia) || Math.abs(diferencia) < 0.005
                        ? "bg-gray-50 text-gray-500"
                        : diferencia < 0
                          ? "bg-red-50 text-red-700"
                          : "bg-green-50 text-green-700"
                    }`}
                  >
                    {!Number.isFinite(diferencia) || Math.abs(diferencia) < 0.005
                      ? "Sin diferencia: no hay nada que ajustar."
                      : `Ajuste: ${diferencia > 0 ? "+" : "−"}${cant(Math.abs(diferencia))} ${unidad}`}
                  </div>
                  {vencido && diferencia > 0 && (
                    <p className="text-xs text-red-600">Un producto vencido solo admite bajas (cantidad menor a la actual).</p>
                  )}

                  <Select
                    isRequired
                    label="Motivo"
                    placeholder="¿Por qué cambia el stock?"
                    selectedKeys={motivo ? [motivo] : []}
                    variant="bordered"
                    onSelectionChange={(k) => setMotivo((Array.from(k)[0] as string) || "")}
                  >
                    {MOTIVOS_AJUSTE.map((m) => (
                      <SelectItem key={m}>{m}</SelectItem>
                    ))}
                  </Select>

                  <Textarea
                    isRequired
                    description={`${comentario.trim().length}/150`}
                    label="Comentario"
                    maxLength={150}
                    minRows={2}
                    placeholder="Ej: se cayó la caja y se rompieron 3 unidades"
                    value={comentario}
                    variant="bordered"
                    onValueChange={setComentario}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button isDisabled={enviando} radius="lg" variant="flat" onPress={cerrar}>
                  Cancelar
                </Button>
                <Button color="warning" isDisabled={!valido} isLoading={enviando} radius="lg" onPress={confirmar}>
                  Confirmar ajuste
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
