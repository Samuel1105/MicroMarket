"use client";

import { Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import React, { useEffect, useMemo, useState } from "react";

import { getWarehouseMovements, MovimientoAlmacenData } from "@/actions/reportes/reporte-movimiento-almacen";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import BaseChart from "@/components/dashboard/BaseChart";
import ChartCard from "@/components/reports/ChartCard";
import { COLORS, columnasDiariasOption } from "@/components/reports/chart-options";
import Insights, { Insight } from "@/components/reports/Insights";
import Kpi from "@/components/reports/Kpi";
import ReportHeader, { ReportRange } from "@/components/reports/ReportHeader";
import { formatRangoEs, getCurrentMonthRange } from "@/src/utils/report-dates";
import { bs, num, variacion } from "@/src/utils/report-format";

const fechaEs = (iso: string) => iso.split("-").reverse().join("/");
const cant = (n: number) => num(n, n % 1 ? 1 : 0);

function buildInsights(d: MovimientoAlmacenData): Insight[] {
  const items: Insight[] = [];
  const a = d.actual;

  if (a.nEntradas === 0 && a.nTraslados === 0) {
    items.push({
      tone: "info",
      text: `No hubo entradas ni traslados entre ${formatRangoEs(d.rango.start, d.rango.end)}.`,
    });
  } else {
    if (a.entradas > a.traslados * 1.5 && a.entradas > 0) {
      items.push({
        tone: "info",
        text: `Ingresó ${bs(a.entradas, 0)} a bodega pero solo pasaste ${bs(a.traslados, 0)} al estante: se está acumulando mercadería en el almacén.`,
      });
    } else if (a.traslados > a.entradas * 1.5 && a.traslados > 0) {
      items.push({
        tone: "info",
        text: `Pasaste ${bs(a.traslados, 0)} al estante y solo ingresaron ${bs(a.entradas, 0)}: estás vaciando la bodega, revisa si hay que comprar.`,
      });
    } else {
      items.push({
        tone: "good",
        text: `Entradas y traslados van parejos (${bs(a.entradas, 0)} y ${bs(a.traslados, 0)}): la bodega se mantiene estable.`,
      });
    }
  }

  if (d.diasHastaEstante !== null && d.diasHastaEstante > DIAS_LENTO) {
    items.push({
      tone: "warn",
      text: `Un lote tarda en promedio ${num(d.diasHastaEstante, 1)} días en pasar de la bodega al estante. Mientras espera, se acerca a su vencimiento.`,
    });
  }

  if (d.esperando.length > 0) {
    const total = d.esperando.reduce((s, l) => s + l.valor, 0);

    items.push({
      tone: "warn",
      text: `${d.esperando.length} ${d.esperando.length === 1 ? "lote lleva" : "lotes llevan"} 15 días o más en bodega sin pasar al estante (${bs(total, 0)}). Pasa primero los que vencen antes.`,
    });
  }

  if (d.descuadre.length > 0) {
    items.push({
      tone: "warn",
      text: `${d.descuadre.length} ${d.descuadre.length === 1 ? "producto no cuadra" : "productos no cuadran"}: el estante no coincide con traslados menos ventas. Revisa si hubo un error al registrar.`,
    });
  } else if (d.productosRevisados > 0) {
    items.push({
      tone: "good",
      text: `El inventario cuadra: en los ${d.productosRevisados} productos, lo que hay en el estante coincide con traslados menos ventas.`,
    });
  }

  return items;
}

const DIAS_LENTO = 7;

export default function WarehouseMovementsReport() {
  const [range, setRange] = useState<ReportRange>(getCurrentMonthRange());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MovimientoAlmacenData | null>(null);

  useEffect(() => {
    let cancelado = false;

    setLoading(true);
    setError(null);
    getWarehouseMovements({ startDate: range.start, endDate: range.end })
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

  const diario = useMemo(
    () =>
      data
        ? columnasDiariasOption(
            data.porDia.map((x) => x.fecha),
            [
              { name: "Entradas a bodega", color: COLORS.ventas, data: data.porDia.map((x) => x.entradas) },
              { name: "Pasado al estante", color: COLORS.traslado, data: data.porDia.map((x) => x.traslados) },
            ],
          )
        : null,
    [data],
  );

  const sinMov = data ? data.actual.nEntradas === 0 && data.actual.nTraslados === 0 : false;

  return (
    <ProtectedRoute allowedRoles={[1, 2, 3]}>
      <div className="p-4 md:p-8 space-y-5">
        <ReportHeader
          crumb="Movimiento de almacén"
          question="¿Qué entró, qué pasó al estante, cuánto tarda y cuadra el inventario?"
          range={range}
          title="Movimiento de almacén"
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
                  definition="Costo de la mercadería que entró al almacén por compras en el período."
                  delta={variacion(data.actual.entradas, data.anterior.entradas)}
                  hint={`${data.actual.nEntradas} ${data.actual.nEntradas === 1 ? "lote ingresó" : "lotes ingresaron"}`}
                  icon="heroicons:arrow-down-tray"
                  label="Entró a bodega"
                  neutralDelta
                  value={bs(data.actual.entradas)}
                />
                <Kpi
                  definition="Costo de lo que sacaste de la bodega y pusiste en el estante para vender."
                  delta={variacion(data.actual.traslados, data.anterior.traslados)}
                  hint={`${data.actual.nTraslados} ${data.actual.nTraslados === 1 ? "traslado" : "traslados"}`}
                  icon="heroicons:arrows-right-left"
                  label="Pasó al estante"
                  neutralDelta
                  tone="secondary"
                  value={bs(data.actual.traslados)}
                />
                <Kpi
                  definition="Días promedio entre que un lote entra a la bodega y se traslada al estante. Menos días = mercadería más fresca."
                  hint={
                    data.diasHastaEstantePrev !== null
                      ? `Período anterior: ${num(data.diasHastaEstantePrev, 1)} días`
                      : "Sin traslados en el período anterior"
                  }
                  icon="heroicons:clock"
                  label="Tarda en llegar al estante"
                  tone="neutral"
                  value={data.diasHastaEstante !== null ? `${num(data.diasHastaEstante, 1)} días` : "—"}
                />
                <Kpi
                  definition="Productos donde lo que hay en el estante no coincide con traslados menos ventas. Se calcula con todo el historial, no solo con este rango."
                  hint={`De ${data.productosRevisados} productos revisados`}
                  icon="heroicons:scale"
                  label="Productos que no cuadran"
                  tone={data.descuadre.length ? "danger" : "success"}
                  value={String(data.descuadre.length)}
                />
              </div>

              <Insights items={insights} />

              <ChartCard
                empty={sinMov}
                legend={[
                  { label: "Entradas a bodega", color: COLORS.ventas },
                  { label: "Pasado al estante", color: COLORS.traslado },
                ]}
                subtitle="Valor al costo de lo que entra y de lo que sale de la bodega cada día"
                title="Día a día"
              >
                {diario && <BaseChart height="320px" option={diario} />}
              </ChartCard>

              {data.esperando.length > 0 && (
                <div className="space-y-3">
                  <div className="px-1">
                    <h3 className="font-bold text-base">Lotes que esperan en bodega</h3>
                    <p className="text-xs text-gray-500">
                      Llevan 15 días o más sin pasar al estante (sin contar los ya vencidos).
                    </p>
                  </div>
                  {data.esperando.map((l) => (
                    <div
                      key={`${l.producto}-${l.lote}`}
                      className="rounded-2xl border border-default-200 bg-white shadow-sm p-4 flex items-center gap-4"
                    >
                      <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Icon height="22" icon="heroicons:archive-box" width="22" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{l.producto}</p>
                        <p className="text-sm text-gray-600">
                          Lote {l.lote} · ingresó el {fechaEs(l.ingreso)} ({l.dias} días) · {cant(l.unidadesEnBodega)}{" "}
                          {l.unidadBase} en bodega
                          {l.vence && <> · vence el {fechaEs(l.vence)}</>}
                        </p>
                      </div>
                      <p className="font-bold tabular-nums">{bs(l.valor, 0)}</p>
                    </div>
                  ))}
                </div>
              )}

              {data.responsables.length > 0 && (
                <div className="space-y-3">
                  <div className="px-1">
                    <h3 className="font-bold text-base">Quién registró los movimientos</h3>
                    <p className="text-xs text-gray-500">Entradas y traslados hechos por cada persona en el período.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {data.responsables.map((r) => (
                      <div key={r.id} className="rounded-2xl border border-default-200 bg-white shadow-sm p-4">
                        <p className="font-semibold">{r.nombre}</p>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-gray-400">Entradas</p>
                            <p className="font-bold tabular-nums">{r.entradas}</p>
                            <p className="text-xs text-gray-500">{bs(r.valorEntradas, 0)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-gray-400">Traslados</p>
                            <p className="font-bold tabular-nums">{r.traslados}</p>
                            <p className="text-xs text-gray-500">{bs(r.valorTraslados, 0)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.descuadre.length > 0 && (
                <div className="space-y-3">
                  <div className="px-1">
                    <h3 className="font-bold text-base">Productos que no cuadran</h3>
                    <p className="text-xs text-gray-500">
                      Esperado = lo trasladado al estante menos lo vendido. Real = lo que el sistema tiene en el estante.
                    </p>
                  </div>
                  {data.descuadre.map((p) => (
                    <div
                      key={p.producto}
                      className="rounded-2xl border border-red-200 bg-red-50/50 p-4 flex items-center gap-4"
                    >
                      <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                        <Icon height="22" icon="heroicons:scale" width="22" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{p.producto}</p>
                        <p className="text-sm text-gray-600">
                          Esperado {cant(p.esperado)} {p.unidadBase} · real {cant(p.real)} {p.unidadBase}
                        </p>
                      </div>
                      <p className="font-bold text-red-600 tabular-nums">
                        {p.diferencia > 0 ? "+" : ""}
                        {cant(p.diferencia)} {p.unidadBase}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-500 px-1">
                Los valores se muestran al costo promedio de compra para poder sumar productos distintos. Entrada =
                compra que llega a la bodega; traslado = pasar producto de la bodega al estante.
              </p>
            </div>
          )
        )}
      </div>
    </ProtectedRoute>
  );
}
