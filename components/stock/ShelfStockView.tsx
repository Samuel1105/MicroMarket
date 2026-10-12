"use client";
import { Button, Card, CardBody, Chip, Pagination, Select, SelectItem, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

import { getAvailableSalesStock } from "@/actions/purchase/stock-extraction-action";
import { useAuth } from "@/app/context/AuthContext";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import ListHeaderCard from "@/components/ui/ListHeaderCard";
import StatCard from "@/components/ui/StatCard";
import { formatVencimiento, getDiasParaVencer, getSeveridad } from "@/src/utils/expiry";
import { formatShortDate } from "@/src/utils/period";

interface StockVenta {
  id: number;
  producto: { id: number; nombre: string; descripcion: string | null; categoria: string };
  unidad: { id: number; nombre: string; abreviatura: string | null };
  lote: { id: number; numeroLote: string } | null;
  cantidadDisponible: number;
  cantidadUnidadesBase: number;
  precioVenta: number;
  fechaVencimiento: string | null;
  fechaRegistro: string | null;
  codigosBarras: { id: number; codigo: string }[];
}

const ROWS_PER_PAGE = 10;

export default function ShelfStockView() {
  const router = useRouter();
  const { hasRole } = useAuth();

  const [stock, setStock] = useState<StockVenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [vencimiento, setVencimiento] = useState("todos");
  const [codigos, setCodigos] = useState("todos");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const result = await getAvailableSalesStock();

        if (result.success) setStock(result.data);
        else setError(result.error ?? "Error desconocido");
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, categoria, vencimiento, codigos]);

  const categorias = useMemo(
    () => Array.from(new Set(stock.map((s) => s.producto.categoria))).sort(),
    [stock],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return stock.filter((s) => {
      const dias = getDiasParaVencer(s.fechaVencimiento);

      if (
        q &&
        !s.producto.nombre.toLowerCase().includes(q) &&
        !s.lote?.numeroLote.toLowerCase().includes(q) &&
        !s.codigosBarras.some((c) => c.codigo.toLowerCase().includes(q))
      )
        return false;
      if (categoria !== "todas" && s.producto.categoria !== categoria) return false;
      if (codigos === "con" && s.codigosBarras.length === 0) return false;
      if (codigos === "sin" && s.codigosBarras.length > 0) return false;
      if (vencimiento === "vencido" && !(dias !== null && dias < 0)) return false;
      if (vencimiento === "pronto" && !(dias !== null && dias >= 0 && dias <= 14)) return false;
      if (vencimiento === "vigente" && !(dias !== null && dias > 14)) return false;
      if (vencimiento === "sin" && dias !== null) return false;

      return true;
    });
  }, [stock, search, categoria, vencimiento, codigos]);

  const valorEstante = filtered.reduce((sum, s) => sum + s.cantidadDisponible * s.precioVenta, 0);
  const totalCodigos = filtered.reduce((sum, s) => sum + s.codigosBarras.length, 0);
  const porVencer = filtered.filter((s) => {
    const d = getDiasParaVencer(s.fechaVencimiento);

    return d !== null && d <= 14;
  }).length;

  const pages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const pageItems = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);
  const activeFilters =
    (categoria !== "todas" ? 1 : 0) + (vencimiento !== "todos" ? 1 : 0) + (codigos !== "todos" ? 1 : 0);

  return (
    <div className="p-4 md:p-8 space-y-5">
      <Breadcrumbs items={[{ label: "Compras" }, { label: "Productos en estante" }]} />

      <ListHeaderCard
        activeFilters={activeFilters}
        description="Lo que ya está listo para vender"
        extra={
          hasRole([1, 5]) ? (
            <Button
              color="primary"
              startContent={<Icon height="20" icon="heroicons:arrow-up-tray" width="20" />}
              onPress={() => router.push("/Dashboard/Purchase/Stock")}
            >
              Extraer del almacén
            </Button>
          ) : null
        }
        filters={
          <>
            <Select
              disallowEmptySelection
              label="Categoría"
              selectedKeys={[categoria]}
              onSelectionChange={(k) => setCategoria((Array.from(k)[0] as string) || "todas")}
            >
              {[
                <SelectItem key="todas">Todas</SelectItem>,
                ...categorias.map((c) => <SelectItem key={c}>{c}</SelectItem>),
              ]}
            </Select>
            <Select
              disallowEmptySelection
              label="Vencimiento"
              selectedKeys={[vencimiento]}
              onSelectionChange={(k) => setVencimiento((Array.from(k)[0] as string) || "todos")}
            >
              <SelectItem key="todos">Todos</SelectItem>
              <SelectItem key="vencido">Ya vencidos</SelectItem>
              <SelectItem key="pronto">Vencen en 14 días o menos</SelectItem>
              <SelectItem key="vigente">Vigentes</SelectItem>
              <SelectItem key="sin">Sin fecha de vencimiento</SelectItem>
            </Select>
            <Select
              disallowEmptySelection
              label="Códigos de barras"
              selectedKeys={[codigos]}
              onSelectionChange={(k) => setCodigos((Array.from(k)[0] as string) || "todos")}
            >
              <SelectItem key="todos">Todos</SelectItem>
              <SelectItem key="con">Con códigos</SelectItem>
              <SelectItem key="sin">Sin códigos</SelectItem>
            </Select>
          </>
        }
        search={search}
        searchPlaceholder="Buscar por producto, lote o código de barras..."
        title="Productos en estante"
        onClearFilters={() => {
          setSearch("");
          setCategoria("todas");
          setVencimiento("todos");
          setCodigos("todos");
        }}
        onSearchChange={setSearch}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="heroicons:cube" label="Productos en estante" tone="primary" value={filtered.length} />
        <StatCard icon="heroicons:banknotes" label="Valor a precio de venta" tone="success" value={`Bs. ${valorEstante.toFixed(2)}`} />
        <StatCard icon="mdi:barcode" label="Códigos de barras" tone="secondary" value={totalCodigos} />
        <StatCard
          hint="Vencen en 14 días o menos"
          icon="heroicons:clock"
          label="Por vencer"
          tone={porVencer > 0 ? "danger" : "neutral"}
          value={porVencer}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner label="Cargando estante..." size="lg" />
        </div>
      ) : error ? (
        <Card className="border border-red-200">
          <CardBody className="p-6 text-red-600 text-sm">No se pudo cargar el estante: {error}</CardBody>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border border-default-200 shadow-sm">
          <CardBody className="p-10 text-center">
            <Icon className="mx-auto text-gray-300 mb-3" height="56" icon="heroicons:cube" width="56" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              {stock.length === 0 ? "El estante está vacío" : "No se encontraron productos"}
            </h3>
            <p className="text-gray-500 text-sm">
              {stock.length === 0
                ? "Extrae productos del almacén para dejarlos listos a la venta."
                : "Prueba con otra búsqueda o limpia los filtros."}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {pageItems.map((s) => {
            const dias = getDiasParaVencer(s.fechaVencimiento);
            const sev = getSeveridad(dias);
            const isOpen = expanded === s.id;

            return (
              <div
                key={s.id}
                className="rounded-2xl border border-default-200 bg-white shadow-sm hover:shadow-md hover:border-primary-200 transition-all p-4 sm:p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                    <Icon height="22" icon="heroicons:cube" width="22" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-base truncate">{s.producto.nombre}</p>
                      <Chip size="sm" variant="flat" color="secondary">
                        {s.producto.categoria}
                      </Chip>
                      {dias !== null && sev && (
                        <Chip size="sm" variant="flat" color={sev}>
                          {formatVencimiento(dias)}
                        </Chip>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Icon height="14" icon="heroicons:archive-box" width="14" />
                        {s.lote ? `Lote ${s.lote.numeroLote}` : "Sin lote"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Icon height="14" icon="heroicons:scale" width="14" />
                        {s.unidad.nombre}
                        {s.unidad.abreviatura ? ` (${s.unidad.abreviatura})` : ""}
                      </span>
                      {s.fechaRegistro && (
                        <span className="flex items-center gap-1.5">
                          <Icon height="14" icon="heroicons:calendar" width="14" />
                          En estante desde {formatShortDate(s.fechaRegistro)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="hidden sm:block text-right shrink-0 w-28">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Precio</p>
                    <p className="font-bold text-primary-700">Bs. {s.precioVenta.toFixed(2)}</p>
                  </div>

                  <div className="text-right shrink-0 w-24">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Disponibles</p>
                    <p className="text-xl font-bold leading-tight">{s.cantidadDisponible}</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-dashed border-default-200">
                  {s.codigosBarras.length > 0 ? (
                    <>
                      <button
                        className="flex items-center gap-1.5 text-sm font-medium text-secondary-700 hover:text-secondary-800"
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : s.id)}
                      >
                        <Icon height="16" icon="mdi:barcode" width="16" />
                        {s.codigosBarras.length} código{s.codigosBarras.length === 1 ? "" : "s"} de barras
                        <Icon height="16" icon={isOpen ? "heroicons:chevron-up" : "heroicons:chevron-down"} width="16" />
                      </button>
                      {isOpen && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {s.codigosBarras.map((c) => (
                            <span
                              key={c.id}
                              className="font-mono text-xs px-2 py-1 rounded-md bg-secondary-50 text-secondary-700"
                            >
                              {c.codigo}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="flex items-center gap-1.5 text-sm text-gray-400">
                      <Icon height="16" icon="mdi:barcode-off" width="16" />
                      Sin códigos de barras: se vende eligiendo el producto en el punto de venta
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length > ROWS_PER_PAGE && (
        <div className="flex justify-center pt-2">
          <Pagination isCompact showControls showShadow color="secondary" page={page} total={pages} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
