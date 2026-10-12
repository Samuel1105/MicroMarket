"use client";

import { Chip, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import React, { useEffect, useMemo, useState } from "react";

import { getSalesByProduct, VentasPorProductoData } from "@/actions/reportes/reporte-ventas-por-producto";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import BaseChart from "@/components/dashboard/BaseChart";
import ChartCard from "@/components/reports/ChartCard";
import { barrasUtilidadOption, COLORS, hBarOption } from "@/components/reports/chart-options";
import Insights, { Insight } from "@/components/reports/Insights";
import Kpi from "@/components/reports/Kpi";
import ReportHeader, { ReportRange } from "@/components/reports/ReportHeader";
import { formatRangoEs, getCurrentMonthRange } from "@/src/utils/report-dates";
import { bs, num, pct, variacion } from "@/src/utils/report-format";

const fechaEs = (iso: string) => iso.split("-").reverse().join("/");
const cant = (n: number) => num(n, n % 1 ? 1 : 0);

function buildInsights(d: VentasPorProductoData): Insight[] {
  const items: Insight[] = [];

  if (d.productos.length === 0) {
    return [{ tone: "warn", text: `No hay ventas entre ${formatRangoEs(d.rango.start, d.rango.end)}. Prueba con otro rango.` }];
  }

  const a = d.productos.filter((p) => p.clase === "A");
  const porcentajeCat = d.catalogo ? (a.length / d.catalogo) * 100 : 0;

  items.push({
    tone: "info",
    text: `${a.length} ${a.length === 1 ? "producto genera" : "productos generan"} el 80% de tus ventas (${pct(porcentajeCat, 0)} de tu catálogo). Que nunca te falten: ${a
      .slice(0, 3)
      .map((p) => p.nombre)
      .join(", ")}${a.length > 3 ? "…" : ""}.`,
  });

  const suben = d.productos.filter((p) => p.cambio !== null && p.cambio >= 30 && p.ingresos - p.ingresosAnterior >= 50);
  const bajan = d.productos.filter((p) => p.cambio !== null && p.cambio <= -30 && p.ingresosAnterior - p.ingresos >= 50);

  if (suben.length) {
    items.push({
      tone: "good",
      text: `Están creciendo: ${suben.slice(0, 3).map((p) => `${p.nombre} (+${pct(p.cambio!, 0)})`).join(", ")}. Asegura stock para no perder ventas.`,
    });
  }

  if (bajan.length) {
    items.push({
      tone: "warn",
      text: `Están cayendo: ${bajan.slice(0, 3).map((p) => `${p.nombre} (${pct(p.cambio!, 0)})`).join(", ")}. Revisa precio, ubicación en el estante o si hay competencia.`,
    });
  }

  if (d.sinVentas.length > 0) {
    items.push({
      tone: "warn",
      text: `${d.sinVentas.length} de ${d.catalogo} productos no vendieron nada en este período. Decide si conviene promocionarlos o dejar de comprarlos.`,
    });
  }

  return items;
}

export default function SalesByProductReport() {
  const [range, setRange] = useState<ReportRange>(getCurrentMonthRange());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VentasPorProductoData | null>(null);

  useEffect(() => {
    let cancelado = false;

    setLoading(true);
    setError(null);
    getSalesByProduct({ startDate: range.start, endDate: range.end })
      .then((res) => {
        if (cancelado) return;
        if (res.success && res.data) setData(res.data);
        else setError(res.error || "No se pudo cargar el reporte");
      })
      .catch(() => !cancelado && setError("No se pudo conectar con el servidor"))
      .finally(() => !cancelado && setLoading(false));

    return () => {
      cancelado = true;
    };
  }, [range.start, range.end]);

  const insights = useMemo(() => (data ? buildInsights(data) : []), [data]);
  const sinVentas = data ? data.productos.length === 0 : false;

  const ranking = useMemo(
    () =>
      data
        ? hBarOption(
            data.productos.slice(0, 10).map((p) => ({ name: p.nombre, value: p.ingresos })),
            { color: COLORS.ventas },
          )
        : null,
    [data],
  );

  const movimientos = useMemo(() => {
    if (!data) return null;
    const filas = data.productos
      .filter((p) => !p.esNuevo)
      .map((p) => ({
        name: p.nombre,
        value: p.ingresos - p.ingresosAnterior,
        detail: `Antes ${bs(p.ingresosAnterior)} → ahora ${bs(p.ingresos)}<br/><b>${p.cambio! >= 0 ? "+" : ""}${p.cambio!.toFixed(0)}%</b>`,
      }))
      .filter((f) => Math.abs(f.value) >= 1)
      .sort((a, b) => b.value - a.value);
    const extremos = filas.length > 12 ? [...filas.slice(0, 6), ...filas.slice(-6)] : filas;

    return extremos.length ? barrasUtilidadOption(extremos) : null;
  }, [data]);

  const categorias = useMemo(
    () =>
      data
        ? hBarOption(
            data.categorias.map((c) => ({ name: c.categoria, value: c.ingresos })),
            { color: COLORS.traslado },
          )
        : null,
    [data],
  );

  const top = data?.productos[0];

  return (
    <ProtectedRoute allowedRoles={[1, 4]}>
      <div className="p-4 md:p-8 space-y-5">
        <ReportHeader
          crumb="Ventas por producto"
          question="¿Qué productos se venden más, cuáles suben o bajan y cuáles no se mueven?"
          range={range}
          title="Ventas por producto"
          onRangeChange={setRange}
        />

        {error && <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 text-sm p-4">{error}</div>}

        {loading && !data ? (
          <div className="flex justify-center py-24">
            <Spinner label="Calculando..." size="lg" />
          </div>
        ) : (
          data && (
            <div className={`space-y-5 mt-4 transition-opacity ${loading ? "opacity-50" : ""}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Kpi
                  definition="Cuántos productos del catálogo tuvieron al menos una venta en el período."
                  hint={`De ${data.catalogo} productos en el catálogo`}
                  icon="heroicons:cube"
                  label="Productos vendidos"
                  value={String(data.productos.length)}
                />
                <Kpi
                  definition="Total vendido por todos los productos (después de descuentos)."
                  delta={variacion(data.total, data.totalAnterior)}
                  hint={`${num(data.productos.reduce((s, p) => s + p.ventas, 0))} líneas de venta`}
                  icon="heroicons:banknotes"
                  label="Ventas"
                  tone="secondary"
                  value={bs(data.total)}
                />
                <Kpi
                  definition="Producto que más dinero dejó en ventas en el período y qué parte del total representa."
                  hint={top ? `${pct(top.participacion, 0)} de tus ventas` : "Sin ventas"}
                  icon="heroicons:trophy"
                  label="Más vendido"
                  tone="success"
                  value={top ? top.nombre : "—"}
                />
                <Kpi
                  definition="Productos del catálogo activo que no se vendieron ni una vez en el período."
                  hint="Del catálogo activo"
                  icon="heroicons:pause-circle"
                  label="Sin ventas"
                  tone={data.sinVentas.length ? "danger" : "success"}
                  value={String(data.sinVentas.length)}
                />
              </div>

              <Insights items={insights} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ChartCard empty={sinVentas} subtitle="Los 10 que más dinero dejaron en ventas" title="Los más vendidos">
                  {ranking && (
                    <BaseChart height={`${Math.max(220, Math.min(10, data.productos.length) * 38 + 20)}px`} option={ranking} />
                  )}
                </ChartCard>

                <ChartCard
                  empty={!movimientos}
                  emptyText="No hay productos con ventas en ambos períodos para comparar."
                  subtitle={`Cuánto más o menos vendieron que en los ${data.rango.dias} días anteriores (Bs.)`}
                  title="Quién sube y quién baja"
                >
                  {movimientos && <BaseChart height="380px" option={movimientos} />}
                </ChartCard>
              </div>

              <ChartCard empty={sinVentas} subtitle="Qué categorías concentran las ventas" title="Ventas por categoría">
                {categorias && (
                  <BaseChart height={`${Math.max(180, data.categorias.length * 42 + 20)}px`} option={categorias} />
                )}
              </ChartCard>

              {data.productos.length > 0 && (
                <div className="space-y-3">
                  <div className="px-1">
                    <h3 className="font-bold text-base">Todos los productos vendidos</h3>
                    <p className="text-xs text-gray-500">
                      Clase A = el 80% de tus ventas · B = hasta el 95% · C = el resto.
                    </p>
                  </div>
                  {data.productos.map((p, i) => (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-default-200 bg-white shadow-sm p-4 flex items-center gap-4"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary-50 text-primary-700 font-bold text-sm flex items-center justify-center shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{p.nombre}</p>
                          <Chip color="secondary" size="sm" variant="flat">
                            {p.categoria}
                          </Chip>
                          <Chip color={p.clase === "A" ? "success" : p.clase === "B" ? "warning" : "default"} size="sm" variant="flat">
                            Clase {p.clase}
                          </Chip>
                          {p.esNuevo && (
                            <Chip color="primary" size="sm" variant="flat">
                              Sin ventas antes
                            </Chip>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {cant(p.unidades)} {p.unidadBase} en {p.ventas} {p.ventas === 1 ? "venta" : "ventas"} ·{" "}
                          {pct(p.participacion)} del total
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold tabular-nums">{bs(p.ingresos)}</p>
                        {p.cambio !== null && (
                          <p className={`text-xs font-semibold ${p.cambio >= 0 ? "text-green-700" : "text-red-600"}`}>
                            {p.cambio >= 0 ? "+" : ""}
                            {p.cambio.toFixed(0)}% vs antes
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {data.sinVentas.length > 0 && (
                <div className="space-y-3">
                  <div className="px-1">
                    <h3 className="font-bold text-base">Productos que no se vendieron</h3>
                    <p className="text-xs text-gray-500">Están en el catálogo pero no tuvieron ventas en este rango.</p>
                  </div>
                  {data.sinVentas.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-default-200 bg-white shadow-sm p-4 flex items-center gap-4"
                    >
                      <div className="w-11 h-11 rounded-xl bg-default-100 text-gray-500 flex items-center justify-center shrink-0">
                        <Icon height="22" icon="heroicons:pause-circle" width="22" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{p.nombre}</p>
                        <p className="text-sm text-gray-600">
                          {p.categoria} ·{" "}
                          {p.ultimaVenta ? `última venta el ${fechaEs(p.ultimaVenta)}` : "nunca se ha vendido"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-500 px-1">
                Los porcentajes de “vs antes” comparan con los {data.rango.dias} días anteriores. Aquí se mide cuánto se
                vende; cuánto deja cada producto está en Rentabilidad.
              </p>
            </div>
          )
        )}
      </div>
    </ProtectedRoute>
  );
}
