"use client";

import { Chip, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import React, { useEffect, useMemo, useState } from "react";

import {
  AnalisisClientesData,
  getCustomerAnalysis,
  SegmentoCliente,
} from "@/actions/reportes/reporte-analisis-clientes";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import BaseChart from "@/components/dashboard/BaseChart";
import ChartCard from "@/components/reports/ChartCard";
import { COLORS, hBarOption } from "@/components/reports/chart-options";
import Insights, { Insight } from "@/components/reports/Insights";
import Kpi from "@/components/reports/Kpi";
import ReportHeader, { ReportRange } from "@/components/reports/ReportHeader";
import SplitBar from "@/components/reports/SplitBar";
import { formatRangoEs, getCurrentMonthRange } from "@/src/utils/report-dates";
import { bs, num, pct, variacion } from "@/src/utils/report-format";

const SEGMENTOS: Record<SegmentoCliente, { label: string; regla: string; color: "success" | "primary" | "warning" | "default" }> = {
  vip: { label: "VIP", regla: "5 o más compras y Bs. 500 o más", color: "success" },
  frecuente: { label: "Frecuente", regla: "3 o más compras", color: "primary" },
  ocasional: { label: "Ocasional", regla: "2 compras", color: "warning" },
  nuevo: { label: "Una compra", regla: "1 sola compra", color: "default" },
};

const fechaEs = (iso: string) => iso.split("-").reverse().join("/");

function buildInsights(d: AnalisisClientesData): Insight[] {
  const items: Insight[] = [];
  const total = d.ventasIdentificadas + d.ventasGenerales;

  if (total === 0) {
    return [{ tone: "warn", text: `No hay ventas entre ${formatRangoEs(d.rango.start, d.rango.end)}. Prueba con otro rango.` }];
  }

  if (d.activos > 0) {
    const pRec = (d.recurrentes / d.activos) * 100;

    items.push({
      tone: pRec >= 50 ? "good" : "info",
      text: `${d.recurrentes} de tus ${d.activos} clientes ya te habían comprado antes (${pct(pRec, 0)}) y ${d.nuevos} ${
        d.nuevos === 1 ? "es nuevo" : "son nuevos"
      }. ${pRec < 50 ? "Vas ganando clientes nuevos pero fidelizas poco: ofrece algo para que vuelvan." : "Buena fidelidad."}`,
    });
  }

  const vip = d.segmentos.find((s) => s.segmento === "vip");

  if (vip && vip.clientes > 0 && d.ventasIdentificadas > 0) {
    items.push({
      tone: "info",
      text: `${vip.clientes} ${vip.clientes === 1 ? "cliente VIP concentra" : "clientes VIP concentran"} el ${pct((vip.gasto / d.ventasIdentificadas) * 100, 0)} de lo que compran tus clientes registrados. Cuídalos: un aviso de ofertas o un pequeño descuento.`,
    });
  }

  if (d.enRiesgo.length > 0) {
    items.push({
      tone: "warn",
      text: `${d.enRiesgo.length} ${d.enRiesgo.length === 1 ? "cliente que compraba seguido no vuelve" : "clientes que compraban seguido no vuelven"} hace más de 30 días. Contáctalos: es más barato recuperar que conseguir uno nuevo.`,
    });
  }

  if (total > 0 && d.ventasGenerales / total > 0.5) {
    items.push({
      tone: "info",
      text: `El ${pct((d.ventasGenerales / total) * 100, 0)} de tus ventas se hizo como “cliente general”. Pide el carnet cuando puedas: sin datos no puedes saber quién te compra ni volver a contactarlo.`,
    });
  }

  return items;
}

export default function CustomerAnalysisReport() {
  const [range, setRange] = useState<ReportRange>(getCurrentMonthRange());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalisisClientesData | null>(null);

  useEffect(() => {
    let cancelado = false;

    setLoading(true);
    setError(null);
    getCustomerAnalysis({ startDate: range.start, endDate: range.end })
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
  const total = data ? data.ventasIdentificadas + data.ventasGenerales : 0;
  const sinVentas = total === 0;

  const top = useMemo(
    () =>
      data
        ? hBarOption(
            data.clientes.slice(0, 10).map((c) => ({ name: c.nombre, value: c.gasto })),
            { color: COLORS.ventas },
          )
        : null,
    [data],
  );

  const segmentos = useMemo(
    () =>
      data
        ? hBarOption(
            data.segmentos
              .filter((s) => s.clientes > 0)
              .map((s) => ({ name: `${SEGMENTOS[s.segmento].label} (${s.clientes})`, value: s.gasto })),
            { color: COLORS.traslado },
          )
        : null,
    [data],
  );

  return (
    <ProtectedRoute allowedRoles={[1, 2]}>
      <div className="p-4 md:p-8 space-y-5">
        <ReportHeader
          crumb="Análisis de clientes"
          question="¿Quiénes son mis mejores clientes, cuántos vuelven y a quiénes debo recuperar?"
          range={range}
          title="Análisis de clientes"
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
                  definition="Clientes registrados que compraron al menos una vez en el período. No incluye al “cliente general”."
                  delta={variacion(data.activos, data.activosAnterior)}
                  hint={`${data.registrados} ${data.registrados === 1 ? "cliente se registró" : "clientes se registraron"} en el período`}
                  icon="heroicons:users"
                  label="Clientes que compraron"
                  value={String(data.activos)}
                />
                <Kpi
                  definition="Nuevos: su primera compra fue en este período. Recurrentes: ya te habían comprado antes."
                  hint={`${data.nuevos} nuevos · ${data.recurrentes} recurrentes`}
                  icon="heroicons:arrow-path"
                  label="Clientes que vuelven"
                  tone="secondary"
                  value={data.activos ? pct((data.recurrentes / data.activos) * 100, 0) : "—"}
                />
                <Kpi
                  definition="Lo que gasta en promedio un cliente registrado en cada compra."
                  delta={variacion(data.ticketPromedio, data.ticketPromedioAnterior)}
                  hint="Por compra, solo clientes registrados"
                  icon="heroicons:shopping-bag"
                  label="Compra promedio"
                  value={bs(data.ticketPromedio)}
                />
                <Kpi
                  definition="Clientes con historial que compraron 2 o más veces pero llevan más de 30 días sin volver."
                  hint="Más de 30 días sin comprar"
                  icon="heroicons:user-minus"
                  label="Clientes en riesgo"
                  tone={data.enRiesgo.length ? "danger" : "success"}
                  value={String(data.enRiesgo.length)}
                />
              </div>

              <Insights items={insights} />

              {!sinVentas && (
                <div className="rounded-2xl bg-white border border-default-200 shadow-sm p-5">
                  <h3 className="font-bold text-base">¿Sé quién me compra?</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Ventas a clientes registrados frente a ventas rápidas como “cliente general”.
                  </p>
                  <SplitBar
                    remainder={{
                      label: "Cliente general",
                      value: data.ventasGenerales,
                      color: COLORS.gris,
                      note: "Sin datos: no puedes volver a contactarlos",
                    }}
                    segments={[
                      {
                        label: "Clientes registrados",
                        value: data.ventasIdentificadas,
                        color: COLORS.ventas,
                        note: "Sabes quiénes son",
                      },
                    ]}
                    total={total}
                    totalLabel="Ventas del período"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ChartCard
                  empty={data.clientes.length === 0}
                  subtitle="Quién gastó más en el período"
                  title="Mejores clientes"
                >
                  {top && <BaseChart height={`${Math.max(220, Math.min(10, data.clientes.length) * 38 + 20)}px`} option={top} />}
                </ChartCard>

                <ChartCard
                  empty={data.clientes.length === 0}
                  subtitle="Cuánto gasta cada tipo de cliente (entre paréntesis, cuántos son)"
                  title="¿Quién sostiene mis ventas?"
                >
                  {segmentos && <BaseChart height="260px" option={segmentos} />}
                </ChartCard>
              </div>

              {data.enRiesgo.length > 0 && (
                <div className="space-y-3">
                  <div className="px-1">
                    <h3 className="font-bold text-base">Clientes que dejaron de venir</h3>
                    <p className="text-xs text-gray-500">
                      Compraban seguido y llevan más de 30 días sin volver. Los que más te compraron, primero.
                    </p>
                  </div>
                  {data.enRiesgo.map((c) => (
                    <div key={c.id} className="rounded-2xl border border-default-200 bg-white shadow-sm p-4 sm:p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                          <Icon height="22" icon="heroicons:user-minus" width="22" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold">{c.nombre}</p>
                            <Chip color="warning" size="sm" variant="flat">
                              {c.diasSinComprar} días sin comprar
                            </Chip>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Última compra el {fechaEs(c.ultimaCompra)} · {c.comprasHistoricas} compras en total ·{" "}
                            {bs(c.gastoHistorico, 0)} gastados · CI {c.carnet}
                          </p>
                          {c.correo && (
                            <p className="text-sm text-secondary-800 bg-secondary-50 rounded-lg px-3 py-2 mt-2">
                              <b>Qué hacer:</b> escríbele a {c.correo} con una oferta de sus productos habituales.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {data.clientes.length > 0 && (
                <div className="space-y-3">
                  <div className="px-1">
                    <h3 className="font-bold text-base">Clientes del período</h3>
                    <p className="text-xs text-gray-500">De quien más gastó a quien menos.</p>
                  </div>
                  {data.clientes.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-default-200 bg-white shadow-sm p-4 flex items-center gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{c.nombre}</p>
                          <Chip color={SEGMENTOS[c.segmento].color} size="sm" variant="flat">
                            {SEGMENTOS[c.segmento].label}
                          </Chip>
                          {c.esNuevo && (
                            <Chip color="secondary" size="sm" variant="flat">
                              Nuevo
                            </Chip>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {c.compras} {c.compras === 1 ? "compra" : "compras"} · {bs(c.ticket)} por compra · última el{" "}
                          {fechaEs(c.ultimaCompra)}
                        </p>
                      </div>
                      <p className="font-bold tabular-nums shrink-0">{bs(c.gasto)}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-2xl bg-white border border-default-200 shadow-sm p-5">
                <h3 className="font-bold text-base mb-2">Cómo se clasifica a un cliente</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                  {(Object.keys(SEGMENTOS) as SegmentoCliente[]).map((k) => (
                    <li key={k}>
                      <b className="text-gray-800">{SEGMENTOS[k].label}:</b> {SEGMENTOS[k].regla} en el período
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-500 mt-3">
                  Las ventas hechas como “cliente general” no se analizan por cliente. Clientes registrados en el período:{" "}
                  {num(data.registrados)}.
                </p>
              </div>
            </div>
          )
        )}
      </div>
    </ProtectedRoute>
  );
}
