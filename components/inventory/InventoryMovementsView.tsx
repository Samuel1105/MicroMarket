"use client";
import { Card, CardBody, Chip, Pagination, Select, SelectItem, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import React, { useEffect, useMemo, useState } from "react";

import {
  getInventoryMovements,
  InventoryMovement,
  MovementType,
} from "@/actions/inventory/inventory-movements-action";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import ListHeaderCard from "@/components/ui/ListHeaderCard";
import StatCard from "@/components/ui/StatCard";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { formatDay, formatTime, inDateRange, inPeriod, Period, PERIOD_OPTIONS } from "@/src/utils/period";

const TIPOS: Record<
  MovementType,
  {
    label: string;
    hint: string;
    icon: string;
    tile: string;
    chip: "success" | "secondary" | "danger" | "warning";
    sign: string;
    qty: string;
  }
> = {
  entrada: {
    label: "Entrada",
    hint: "Ingresó al almacén por una compra",
    icon: "heroicons:arrow-down-tray",
    tile: "bg-green-50 text-green-600",
    chip: "success",
    sign: "+",
    qty: "text-green-600",
  },
  traslado: {
    label: "Traslado a estante",
    hint: "Pasó del almacén al estante",
    icon: "heroicons:arrows-right-left",
    tile: "bg-secondary-50 text-secondary-600",
    chip: "secondary",
    sign: "",
    qty: "text-secondary-700",
  },
  salida: {
    label: "Salida por venta",
    hint: "Se vendió",
    icon: "heroicons:arrow-up-tray",
    tile: "bg-red-50 text-red-600",
    chip: "danger",
    sign: "-",
    qty: "text-red-600",
  },
  ajuste: {
    label: "Ajuste de inventario",
    hint: "Se corrigió el stock",
    icon: "heroicons:adjustments-horizontal",
    tile: "bg-amber-50 text-amber-600",
    chip: "warning",
    sign: "",
    qty: "text-amber-700",
  },
};

const ROWS_PER_PAGE = 15;

export default function InventoryMovementsView() {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [periodo, setPeriodo] = useState<Period>("30d");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [rangeKey, setRangeKey] = useState(0);
  const hayRango = Boolean(desde || hasta);
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      const result = await getInventoryMovements();

      if (result.success) setMovements(result.data);
      else setError(result.error);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, tipo, periodo, desde, hasta]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return movements.filter((m) => {
      if (tipo !== "todos" && m.tipo !== tipo) return false;
      if (hayRango ? !inDateRange(m.fecha, desde, hasta) : !inPeriod(m.fecha, periodo)) return false;
      if (
        q &&
        ![m.producto, m.lote, m.referencia, m.contraparte, m.codigoBarras, m.categoria].some((v) =>
          v?.toLowerCase().includes(q),
        )
      )
        return false;

      return true;
    });
  }, [movements, search, tipo, periodo, desde, hasta, hayRango]);

  const counts = useMemo(
    () => ({
      entrada: filtered.filter((m) => m.tipo === "entrada" && !m.anulado).length,
      traslado: filtered.filter((m) => m.tipo === "traslado").length,
      salida: filtered.filter((m) => m.tipo === "salida").length,
      ajuste: filtered.filter((m) => m.tipo === "ajuste").length,
    }),
    [filtered],
  );

  const pages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const pageItems = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);
  const activeFilters = (tipo !== "todos" ? 1 : 0) + (hayRango ? 1 : periodo !== "30d" ? 1 : 0);

  return (
    <div className="p-4 md:p-8 space-y-5">
      <Breadcrumbs items={[{ label: "Inventario" }, { label: "Movimientos" }]} />

      <ListHeaderCard
        activeFilters={activeFilters}
        description="Todo lo que entra y sale: compras, traslados a estante, ventas y ajustes de inventario"
        filters={
          <>
            <Select
              disallowEmptySelection
              label="Tipo de movimiento"
              selectedKeys={[tipo]}
              onSelectionChange={(k) => setTipo((Array.from(k)[0] as string) || "todos")}
            >
              <SelectItem key="todos">Todos</SelectItem>
              <SelectItem key="entrada">Entradas (compras)</SelectItem>
              <SelectItem key="traslado">Traslados a estante</SelectItem>
              <SelectItem key="salida">Salidas (ventas)</SelectItem>
              <SelectItem key="ajuste">Ajustes de inventario</SelectItem>
            </Select>
            <Select
              description={hayRango ? "Usando el rango de fechas" : undefined}
              disallowEmptySelection
              isDisabled={hayRango}
              label="Período"
              selectedKeys={[periodo]}
              onSelectionChange={(k) => setPeriodo((Array.from(k)[0] as Period) || "30d")}
            >
              {PERIOD_OPTIONS.map((p) => (
                <SelectItem key={p.key}>{p.label}</SelectItem>
              ))}
            </Select>
            <DateRangeFilter
              resetKey={rangeKey}
              onChange={(d, h) => {
                setDesde(d);
                setHasta(h);
              }}
            />
          </>
        }
        filtersCols={3}
        search={search}
        searchPlaceholder="Buscar producto, lote, compra, venta o código..."
        title="Movimientos"
        onClearFilters={() => {
          setSearch("");
          setTipo("todos");
          setPeriodo("30d");
          setDesde("");
          setHasta("");
          setRangeKey((k) => k + 1);
        }}
        onSearchChange={setSearch}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          hint="Compras que ingresaron"
          icon="heroicons:arrow-down-tray"
          label="Entradas"
          tone="success"
          value={counts.entrada}
        />
        <StatCard
          hint="Del almacén al estante"
          icon="heroicons:arrows-right-left"
          label="Traslados"
          tone="secondary"
          value={counts.traslado}
        />
        <StatCard
          hint="Productos vendidos"
          icon="heroicons:arrow-up-tray"
          label="Salidas"
          tone="danger"
          value={counts.salida}
        />
        <StatCard
          hint="Correcciones de stock"
          icon="heroicons:adjustments-horizontal"
          label="Ajustes"
          tone="warning"
          value={counts.ajuste}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner label="Cargando movimientos..." size="lg" />
        </div>
      ) : error ? (
        <Card className="border border-red-200">
          <CardBody className="p-6 text-red-600 text-sm">
            No se pudieron cargar los movimientos: {error}
          </CardBody>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border border-default-200 shadow-sm">
          <CardBody className="p-10 text-center">
            <Icon
              className="mx-auto text-gray-300 mb-3"
              height="56"
              icon="heroicons:arrows-right-left"
              width="56"
            />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No hay movimientos</h3>
            <p className="text-gray-500 text-sm">Prueba con otro período o limpia los filtros.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {pageItems.map((m, i) => {
            const cfg = TIPOS[m.tipo];
            const nuevoDia = i === 0 || formatDay(pageItems[i - 1].fecha) !== formatDay(m.fecha);

            return (
              <React.Fragment key={m.id}>
                {nuevoDia && (
                  <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {formatDay(m.fecha)}
                  </p>
                )}
                <div className="rounded-2xl border border-default-200 bg-white shadow-sm hover:shadow-md transition-all p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${cfg.tile}`}
                    >
                      <Icon height="22" icon={cfg.icon} width="22" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{m.producto}</p>
                        <Chip color={m.anulado ? "default" : cfg.chip} size="sm" variant="flat">
                          {m.anulado ? "Ingreso anulado" : cfg.label}
                        </Chip>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                        {m.referencia && (
                          <span className="flex items-center gap-1">
                            <Icon height="13" icon="heroicons:document-text" width="13" />
                            {m.tipo === "entrada" ? "Compra" : "Venta"} {m.referencia}
                          </span>
                        )}
                        {m.contraparte && (
                          <span className="flex items-center gap-1">
                            <Icon
                              height="13"
                              icon={m.tipo === "entrada" ? "heroicons:building-storefront" : "heroicons:user"}
                              width="13"
                            />
                            {m.contraparte}
                          </span>
                        )}
                        {m.lote && (
                          <span className="flex items-center gap-1">
                            <Icon height="13" icon="heroicons:archive-box" width="13" />
                            Lote {m.lote}
                          </span>
                        )}
                        {m.codigoBarras && (
                          <span className="flex items-center gap-1 font-mono">
                            <Icon height="13" icon="mdi:barcode" width="13" />
                            {m.codigoBarras}
                          </span>
                        )}
                        {m.ajuste && (
                          <>
                            <span className="flex items-center gap-1">
                              <Icon height="13" icon="heroicons:map-pin" width="13" />
                              {m.ajuste.ubicacion === "almacen" ? "Almacén" : "Estante"}
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-amber-700">
                              <Icon height="13" icon="heroicons:tag" width="13" />
                              {m.ajuste.motivo}
                            </span>
                            <span className="flex items-center gap-1">
                              <Icon height="13" icon="heroicons:user" width="13" />
                              {m.ajuste.usuario}
                            </span>
                          </>
                        )}
                        {!m.referencia && !m.lote && !m.ajuste && <span>{cfg.hint}</span>}
                      </div>
                      {m.ajuste?.comentario && <p className="text-xs text-gray-500 mt-1">“{m.ajuste.comentario}”</p>}
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={`text-lg font-bold leading-tight ${
                          m.anulado ? "text-gray-400 line-through" : m.tipo === "ajuste" ? (m.cantidad < 0 ? "text-red-600" : "text-green-600") : cfg.qty
                        }`}
                      >
                        {m.tipo === "ajuste" ? (m.cantidad > 0 ? "+" : "") : cfg.sign}
                        {m.cantidad} <span className="text-xs font-semibold">{m.unidad}</span>
                      </p>
                      <p className="text-xs text-gray-400">{formatTime(m.fecha)}</p>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {!loading && filtered.length > ROWS_PER_PAGE && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <Pagination
            isCompact
            showControls
            showShadow
            color="secondary"
            page={page}
            total={pages}
            onChange={setPage}
          />
          <p className="text-xs text-gray-500">
            Mostrando {(page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, filtered.length)} de{" "}
            {filtered.length} movimientos
          </p>
        </div>
      )}
    </div>
  );
}
