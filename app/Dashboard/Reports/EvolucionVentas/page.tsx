"use client";

import { Spinner } from "@heroui/react";
import React, { useEffect, useMemo, useState } from "react";

import { EvolucionVentasData, getSalesEvolution } from "@/actions/reportes/reporte-evolucion-ventas";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import BaseChart from "@/components/dashboard/BaseChart";
import ChartCard from "@/components/reports/ChartCard";
import { COLORS, columnasOption, ventasVsAnteriorOption } from "@/components/reports/chart-options";
import Insights, { Insight } from "@/components/reports/Insights";
import Kpi from "@/components/reports/Kpi";
import ReportHeader, { ReportRange } from "@/components/reports/ReportHeader";
import { formatRangoEs, getCurrentMonthRange } from "@/src/utils/report-dates";
import { bs, num, pct, variacion } from "@/src/utils/report-format";

const fechaEs = (iso: string) => iso.split("-").reverse().join("/");
const franja = (h: number) => `${String(h).padStart(2, "0")}:00`;

function buildInsights(d: EvolucionVentasData): Insight[] {
  const items: Insight[] = [];

  if (d.actual.numero === 0) {
    return [{ tone: "warn", text: `No hay ventas entre ${formatRangoEs(d.rango.start, d.rango.end)}. Prueba con otro rango.` }];
  }

  const cambio = variacion(d.actual.ventas, d.anterior.ventas);

  if (cambio !== null) {
    items.push({
      tone: cambio >= 0 ? "good" : "warn",
      text: `Vendiste ${bs(d.actual.ventas, 0)}: ${cambio >= 0 ? "un" : "una caída del"} ${pct(Math.abs(cambio))}${
        cambio >= 0 ? " más" : ""
      } que los ${d.rango.dias} días anteriores (${bs(d.anterior.ventas, 0)}).`,
    });
  }

  if (d.tendencia !== null && Math.abs(d.tendencia) >= 10) {
    items.push({
      tone: d.tendencia > 0 ? "good" : "warn",
      text:
        d.tendencia > 0
          ? `Dentro del período vas subiendo: la segunda mitad vendió ${pct(d.tendencia, 0)} más que la primera.`
          : `Dentro del período vas bajando: la segunda mitad vendió ${pct(Math.abs(d.tendencia), 0)} menos que la primera.`,
    });
  }

  const dias = d.porDiaSemana.filter((x) => x.ocurrencias > 0);
  const mejor = [...dias].sort((a, b) => b.promedio - a.promedio)[0];
  const peor = [...dias].sort((a, b) => a.promedio - b.promedio)[0];

  if (mejor && peor && mejor.dia !== peor.dia && mejor.promedio > 0) {
    items.push({
      tone: "info",
      text: `Tu mejor día es el ${mejor.dia.toLowerCase()} (${bs(mejor.promedio, 0)} en promedio) y el más flojo el ${peor.dia.toLowerCase()} (${bs(peor.promedio, 0)}). Refuerza el stock antes de los días fuertes y prueba promociones en los flojos.`,
    });
  }

  const hora = [...d.porHora].sort((a, b) => b.ventas - a.ventas)[0];

  if (hora) {
    items.push({
      tone: "info",
      text: `La hora que más vende es ${franja(hora.hora)}–${franja(hora.hora + 1)} (${bs(hora.ventas, 0)}). Ten al personal completo en ese horario.`,
    });
  }

  if (d.diasSinVentas > 0) {
    items.push({
      tone: "warn",
      text: `${d.diasSinVentas} ${d.diasSinVentas === 1 ? "día" : "días"} del período no tuvo ventas.`,
    });
  }

  return items;
}

export default function SalesEvolutionReport() {
  const [range, setRange] = useState<ReportRange>(getCurrentMonthRange());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EvolucionVentasData | null>(null);

  useEffect(() => {
    let cancelado = false;

    setLoading(true);
    setError(null);
    getSalesEvolution({ startDate: range.start, endDate: range.end })
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
  const sinVentas = data ? data.actual.numero === 0 : false;

  const linea = useMemo(
    () =>
      data
        ? ventasVsAnteriorOption(
            data.porDia.map((p) => p.fecha),
            data.porDia.map((p) => p.ventas),
            data.porDia.map((p) => p.ventasAnterior),
            `${data.rango.dias} días anteriores`,
          )
        : null,
    [data],
  );

  const semana = useMemo(
    () =>
      data
        ? columnasOption(
            data.porDiaSemana.map((s) => ({
              name: s.dia.slice(0, 3),
              value: s.promedio,
              detail: `${s.ocurrencias} ${s.ocurrencias === 1 ? "día" : "días"} en el período`,
            })),
            { color: COLORS.ventas },
          )
        : null,
    [data],
  );

  const horas = useMemo(
    () =>
      data
        ? columnasOption(
            data.porHora.map((h) => ({
              name: franja(h.hora),
              value: h.ventas,
              detail: `${h.numero} ${h.numero === 1 ? "venta" : "ventas"}`,
            })),
            { color: COLORS.traslado },
          )
        : null,
    [data],
  );

  return (
    <ProtectedRoute allowedRoles={[1, 2]}>
      <div className="p-4 md:p-8 space-y-5">
        <ReportHeader
          crumb="Evolución de ventas"
          question="¿Cómo van mis ventas, subo o bajo, y en qué días y horas se vende más?"
          range={range}
          title="Evolución de ventas"
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
                  definition="Suma del total de todas las ventas del período (después de descuentos)."
                  delta={variacion(data.actual.ventas, data.anterior.ventas)}
                  hint={`${data.rango.dias} ${data.rango.dias === 1 ? "día" : "días"}`}
                  icon="heroicons:banknotes"
                  label="Ventas"
                  value={bs(data.actual.ventas)}
                />
                <Kpi
                  definition="Cantidad de ventas (tickets) realizadas."
                  delta={variacion(data.actual.numero, data.anterior.numero)}
                  hint={`${num(data.actual.numero / data.rango.dias, 1)} ventas por día`}
                  icon="heroicons:receipt-percent"
                  label="Número de ventas"
                  tone="secondary"
                  value={num(data.actual.numero)}
                />
                <Kpi
                  definition="Lo que gasta en promedio un cliente en cada venta: ventas ÷ número de ventas."
                  delta={variacion(data.actual.ticket, data.anterior.ticket)}
                  hint="Por cada venta"
                  icon="heroicons:shopping-cart"
                  label="Ticket promedio"
                  value={bs(data.actual.ticket)}
                />
                <Kpi
                  definition="Total de descuentos que diste en las ventas del período."
                  delta={variacion(data.actual.descuentos, data.anterior.descuentos)}
                  hint={
                    data.actual.ventas + data.actual.descuentos > 0
                      ? `${pct((data.actual.descuentos / (data.actual.ventas + data.actual.descuentos)) * 100)} de lo que pudiste vender`
                      : "Sin descuentos"
                  }
                  icon="heroicons:tag"
                  label="Descuentos"
                  tone="neutral"
                  upIsGood={false}
                  value={bs(data.actual.descuentos)}
                />
              </div>

              <Insights items={insights} />

              <ChartCard
                empty={sinVentas}
                legend={[
                  { label: "Este período", color: COLORS.ventas },
                  { label: `${data.rango.dias} días anteriores`, color: COLORS.gris },
                ]}
                subtitle="Ventas de cada día, comparadas con el mismo día del período anterior"
                title="Ventas día a día"
              >
                {linea && <BaseChart height="340px" option={linea} />}
              </ChartCard>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ChartCard
                  empty={sinVentas}
                  subtitle="Lo que vendes en promedio cada día de la semana"
                  title="¿Qué días se vende más?"
                >
                  {semana && <BaseChart height="300px" option={semana} />}
                </ChartCard>

                <ChartCard
                  empty={sinVentas}
                  subtitle="Total vendido según la hora del día"
                  title="¿A qué hora se vende más?"
                >
                  {horas && <BaseChart height="300px" option={horas} />}
                </ChartCard>
              </div>

              {data.mejorDia && (
                <p className="text-xs text-gray-500 px-1">
                  Mejor día del período: {fechaEs(data.mejorDia.fecha)} con {bs(data.mejorDia.ventas)}.
                  {data.peorDia && (
                    <> Día más bajo con ventas: {fechaEs(data.peorDia.fecha)} con {bs(data.peorDia.ventas)}.</>
                  )}{" "}
                  La comparación usa los {data.rango.dias} días inmediatamente anteriores.
                </p>
              )}
            </div>
          )
        )}
      </div>
    </ProtectedRoute>
  );
}
