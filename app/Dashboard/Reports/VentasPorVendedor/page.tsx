"use client";

import { Chip, Spinner } from "@heroui/react";
import React, { useEffect, useMemo, useState } from "react";

import { getEmployeeSales, VentasEmpleadoData } from "@/actions/reportes/reporte-ventas-empleado";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import BaseChart from "@/components/dashboard/BaseChart";
import ChartCard from "@/components/reports/ChartCard";
import { COLORES_PERSONAS, hBarOption, lineasPorPersonaOption } from "@/components/reports/chart-options";
import Insights, { Insight } from "@/components/reports/Insights";
import Kpi from "@/components/reports/Kpi";
import ReportHeader, { ReportRange } from "@/components/reports/ReportHeader";
import { formatRangoEs, getCurrentMonthRange } from "@/src/utils/report-dates";
import { bs, num, pct, variacion } from "@/src/utils/report-format";

const fechaEs = (iso: string) => iso.split("-").reverse().join("/");

function buildInsights(d: VentasEmpleadoData): Insight[] {
  const items: Insight[] = [];
  const conVentas = d.empleados.filter((e) => e.numero > 0);

  if (conVentas.length === 0) {
    return [{ tone: "warn", text: `No hay ventas entre ${formatRangoEs(d.rango.start, d.rango.end)}. Prueba con otro rango.` }];
  }

  const lider = conVentas[0];

  items.push({
    tone: "info",
    text: `${lider.nombre} lidera con ${bs(lider.ventas, 0)} (${pct(lider.participacion, 0)} de las ventas) en ${lider.numero} ${lider.numero === 1 ? "venta" : "ventas"}.`,
  });

  if (conVentas.length > 1) {
    const mejorTicket = [...conVentas].sort((a, b) => b.ticket - a.ticket)[0];
    const peorTicket = [...conVentas].sort((a, b) => a.ticket - b.ticket)[0];

    if (mejorTicket.id !== peorTicket.id && mejorTicket.ticket > peorTicket.ticket * 1.2) {
      items.push({
        tone: "info",
        text: `${mejorTicket.nombre} logra ${bs(mejorTicket.ticket, 0)} por venta y ${peorTicket.nombre} ${bs(peorTicket.ticket, 0)}. Pídele que comparta cómo ofrece productos complementarios.`,
      });
    }

    const conMasDescuento = [...conVentas].sort((a, b) => b.descuentoPct - a.descuentoPct)[0];

    if (conMasDescuento.descuentoPct > Math.max(d.descuentoPctGeneral * 1.5, 1)) {
      items.push({
        tone: "warn",
        text: `${conMasDescuento.nombre} da más descuentos que el resto: ${pct(conMasDescuento.descuentoPct)} de lo que vende, frente a ${pct(d.descuentoPctGeneral)} del promedio. Revisa que estén autorizados.`,
      });
    }
  }

  const inactivos = d.empleados.filter((e) => e.numero === 0 && e.rol === "Cajero");

  if (inactivos.length > 0) {
    items.push({
      tone: "warn",
      text: `${inactivos.map((e) => e.nombre).join(", ")} no ${inactivos.length === 1 ? "registró" : "registraron"} ventas en este período.`,
    });
  }

  return items;
}

export default function EmployeeSalesReport() {
  const [range, setRange] = useState<ReportRange>(getCurrentMonthRange());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VentasEmpleadoData | null>(null);

  useEffect(() => {
    let cancelado = false;

    setLoading(true);
    setError(null);
    getEmployeeSales({ startDate: range.start, endDate: range.end })
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
  const activos = useMemo(() => data?.empleados.filter((e) => e.numero > 0) ?? [], [data]);
  // El color sigue a la persona (orden fijo por id), no a su lugar en el ranking
  const colorDe = useMemo(() => {
    const ids = [...(data?.empleados ?? [])].map((e) => e.id).sort((a, b) => a - b);

    return (id: number) => COLORES_PERSONAS[ids.indexOf(id) % COLORES_PERSONAS.length];
  }, [data]);

  const ranking = useMemo(
    () => (activos.length ? hBarOption(activos.map((e) => ({ name: e.nombre, value: e.ventas })), { color: COLORES_PERSONAS[0] }) : null),
    [activos],
  );

  const lineas = useMemo(
    () =>
      data
        ? lineasPorPersonaOption(
            data.dias,
            activos.map((e) => ({ name: e.nombre, color: colorDe(e.id), data: e.porDia })),
          )
        : null,
    [data, activos, colorDe],
  );

  const sinVentas = activos.length === 0;

  return (
    <ProtectedRoute allowedRoles={[1, 2]}>
      <div className="p-4 md:p-8 space-y-5">
        <ReportHeader
          crumb="Ventas por empleado"
          question="¿Quién vende más, con qué ticket y cómo se reparte el trabajo?"
          range={range}
          title="Ventas por empleado"
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
                  definition="Total vendido por todos los empleados en el período."
                  delta={variacion(data.total, data.totalAnterior)}
                  hint={`${num(data.numero)} ventas`}
                  icon="heroicons:banknotes"
                  label="Ventas del equipo"
                  value={bs(data.total)}
                />
                <Kpi
                  definition="Empleados que registraron al menos una venta en el período."
                  hint={`De ${data.empleados.length} en la lista`}
                  icon="heroicons:user-group"
                  label="Empleados que vendieron"
                  tone="secondary"
                  value={String(activos.length)}
                />
                <Kpi
                  definition="Empleado que más vendió en el período y cuánto del total representa."
                  hint={activos[0] ? `${pct(activos[0].participacion, 0)} de las ventas · ${bs(activos[0].ventas, 0)}` : "Sin ventas"}
                  icon="heroicons:trophy"
                  label="Mayor vendedor"
                  tone="success"
                  value={activos[0]?.nombre ?? "—"}
                />
                <Kpi
                  definition="Descuentos dados como porcentaje de lo que se habría vendido sin descuento, entre todo el equipo."
                  hint="Sobre el precio de lista"
                  icon="heroicons:tag"
                  label="Descuento promedio"
                  tone="neutral"
                  value={pct(data.descuentoPctGeneral)}
                />
              </div>

              <Insights items={insights} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ChartCard empty={sinVentas} subtitle="Total vendido por cada empleado" title="Ranking de ventas">
                  {ranking && <BaseChart height={`${Math.max(180, activos.length * 48 + 20)}px`} option={ranking} />}
                </ChartCard>

                <ChartCard
                  empty={sinVentas}
                  legend={activos.map((e) => ({ label: e.nombre, color: colorDe(e.id) }))}
                  subtitle="Ventas de cada empleado, día por día"
                  title="Cómo se reparte el trabajo"
                >
                  {lineas && <BaseChart height="300px" option={lineas} />}
                </ChartCard>
              </div>

              <div className="space-y-3">
                <div className="px-1">
                  <h3 className="font-bold text-base">Detalle por empleado</h3>
                  <p className="text-xs text-gray-500">Comparado con los {data.rango.dias} días anteriores.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.empleados.map((e) => (
                    <div key={e.id} className="rounded-2xl border border-default-200 bg-white shadow-sm p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <i className="inline-block w-3 h-3 rounded-full" style={{ background: colorDe(e.id) }} />
                            <p className="font-semibold">{e.nombre}</p>
                            {e.rol && (
                              <Chip color="secondary" size="sm" variant="flat">
                                {e.rol}
                              </Chip>
                            )}
                          </div>
                          {e.cambio !== null && (
                            <p className={`text-xs font-semibold mt-1 ${e.cambio >= 0 ? "text-green-700" : "text-red-600"}`}>
                              {e.cambio >= 0 ? "+" : ""}
                              {e.cambio.toFixed(0)}% vs período anterior
                            </p>
                          )}
                        </div>
                        <p className="text-xl font-bold tabular-nums">{bs(e.ventas, 0)}</p>
                      </div>

                      {e.numero === 0 ? (
                        <p className="text-sm text-gray-500 mt-3">No registró ventas en este período.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-3 mt-4">
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-gray-400">Ventas</p>
                            <p className="font-bold tabular-nums">{e.numero}</p>
                            <p className="text-xs text-gray-500">{pct(e.participacion, 0)} del total</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-gray-400">Ticket</p>
                            <p className="font-bold tabular-nums">{bs(e.ticket, 0)}</p>
                            <p className="text-xs text-gray-500">por venta</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-gray-400">Descuentos</p>
                            <p className="font-bold tabular-nums">{bs(e.descuentos, 0)}</p>
                            <p className="text-xs text-gray-500">{pct(e.descuentoPct)}</p>
                          </div>
                        </div>
                      )}

                      {e.mejorDia && (
                        <p className="text-xs text-gray-500 mt-3">
                          Mejor día: {fechaEs(e.mejorDia.fecha)} con {bs(e.mejorDia.ventas, 0)} · vendió en {e.diasConVentas}{" "}
                          de {data.rango.dias} días
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </ProtectedRoute>
  );
}
