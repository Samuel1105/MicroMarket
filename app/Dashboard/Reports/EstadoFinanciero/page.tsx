"use client";

import { Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import React, { useEffect, useMemo, useState } from "react";

import { FinancialReportData, getFinancialReport } from "@/actions/reportes/reporte-financiero";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import BaseChart from "@/components/dashboard/BaseChart";
import ChartCard from "@/components/reports/ChartCard";
import { acumuladoOption, COLORS, hBarOption } from "@/components/reports/chart-options";
import Insights, { Insight } from "@/components/reports/Insights";
import Kpi from "@/components/reports/Kpi";
import ReportHeader, { ReportRange } from "@/components/reports/ReportHeader";
import SplitBar from "@/components/reports/SplitBar";
import { formatRangoEs, getCurrentMonthRange } from "@/src/utils/report-dates";
import { bs, num, pct, variacion } from "@/src/utils/report-format";

function fechaEs(iso: string): string {
  const [y, m, d] = iso.split("-");

  return `${d}/${m}/${y}`;
}

function buildInsights(d: FinancialReportData): Insight[] {
  const a = d.actual;
  const items: Insight[] = [];

  if (a.numeroVentas === 0) {
    items.push({
      tone: "warn",
      text: `No hay ventas registradas entre ${formatRangoEs(d.rango.start, d.rango.end)}. Prueba con otro rango de fechas.`,
    });

    return items;
  }

  if (a.utilidad < 0) {
    items.push({
      tone: "warn",
      text: `Perdiste dinero en este período: después de pagar la mercadería vendida y la que se venció, faltaron ${bs(Math.abs(a.utilidad))}. Revisa los precios en Rentabilidad.`,
    });
  } else if (a.margen < 15) {
    items.push({
      tone: "warn",
      text: `Tu margen es de ${pct(a.margen)}, bajo: por cada Bs. 100 vendidos quedan Bs. ${a.margen.toFixed(0)} antes de los gastos del local. Mira qué productos dejan menos en Rentabilidad.`,
    });
  } else {
    items.push({
      tone: "good",
      text: `Estás en ganancia: ${bs(a.utilidad)} de utilidad (margen ${pct(a.margen)}) sobre ${bs(a.ventas)} vendidos, antes de los gastos del local.`,
    });
  }

  if (a.perdidaVencimiento > 0) {
    const top = d.vencidos.slice(0, 3).map((v) => v.producto);
    const unicos = Array.from(new Set(top)).join(", ");

    items.push({
      tone: "warn",
      text: `Se venció mercadería por ${bs(a.perdidaVencimiento)} (${pct((a.perdidaVencimiento / a.ventas) * 100)} de lo vendido): ${unicos}. Compra menos de esos productos o ponlos en promoción antes de que venzan.`,
    });
  }

  const dv = variacion(a.ventas, d.anterior.ventas);

  if (dv !== null && dv <= -10) {
    items.push({ tone: "warn", text: `Las ventas bajaron ${Math.abs(dv).toFixed(1)}% frente al período anterior.` });
  } else if (dv !== null && dv >= 10) {
    items.push({ tone: "good", text: `Las ventas subieron ${dv.toFixed(1)}% frente al período anterior.` });
  }

  if (a.compras > a.ventas * 1.2) {
    items.push({
      tone: "info",
      text: `Compraste ${bs(a.compras)}, más de lo que vendiste (${bs(a.ventas)}). Es normal cuando repones stock: esa mercadería sigue en tu almacén y no es pérdida. Solo vigila que no se estanque ni se venza (reporte de Almacén).`,
    });
  }

  const prov = d.comprasPorProveedor[0];

  if (prov && d.comprasPorProveedor.length > 1 && prov.porcentaje >= 60) {
    items.push({
      tone: "info",
      text: `El ${pct(prov.porcentaje, 0)} de tus compras es a ${prov.proveedor}. Depender de un solo proveedor te deja sin margen para negociar precios.`,
    });
  }

  const cat = d.ventasPorCategoria[0];

  if (cat && d.ventasPorCategoria.length > 1 && cat.total / a.ventas >= 0.5) {
    items.push({
      tone: "info",
      text: `${cat.categoria} concentra el ${pct((cat.total / a.ventas) * 100, 0)} de tus ventas.`,
    });
  }

  if (d.productosSinCosto.length > 0) {
    const nombres = d.productosSinCosto.slice(0, 3).join(", ");
    const resto = d.productosSinCosto.length > 3 ? ` y ${d.productosSinCosto.length - 3} más` : "";

    items.push({
      tone: "warn",
      text: `Vendiste productos sin ninguna compra registrada (${nombres}${resto}). Su costo cuenta como 0, así que la utilidad puede verse mayor de lo real.`,
    });
  }

  if (d.productosVendidosDeMas.length > 0) {
    const nombres = d.productosVendidosDeMas.slice(0, 3).join(", ");
    const resto = d.productosVendidosDeMas.length > 3 ? ` y ${d.productosVendidosDeMas.length - 3} más` : "";

    items.push({
      tone: "warn",
      text: `Registraste más ventas de las unidades que compraste (${nombres}${resto}). Los registros de compras o de unidades no cuadran, y por eso el costo de lo vendido puede estar distorsionado. Revísalo en el historial de compras.`,
    });
  }

  return items;
}

export default function FinancialReport() {
  const [range, setRange] = useState<ReportRange>(getCurrentMonthRange());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FinancialReportData | null>(null);

  useEffect(() => {
    let cancelado = false;

    setLoading(true);
    setError(null);
    getFinancialReport({ startDate: range.start, endDate: range.end })
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

  const acumulado = useMemo(
    () =>
      data
        ? acumuladoOption(
            data.ventasPorDia.map((d) => d.fecha),
            data.ventasPorDia.map((d) => d.monto),
            data.comprasPorDia.map((d) => d.monto),
          )
        : null,
    [data],
  );

  const sinVentas = data ? data.actual.numeroVentas === 0 : false;
  const sinMovimiento = data ? data.actual.numeroVentas === 0 && data.actual.compras === 0 : false;

  return (
    <ProtectedRoute allowedRoles={[1]}>
      <div className="p-4 md:p-8 space-y-5">
        <ReportHeader
          crumb="Estado financiero"
          question="¿Estamos en ganancia en este período? ¿En qué se está yendo más dinero?"
          range={range}
          title="Estado financiero"
          onRangeChange={setRange}
        />

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 text-sm p-4">{error}</div>
        )}

        {loading && !data ? (
          <div className="flex justify-center py-24">
            <Spinner label="Calculando..." size="lg" />
          </div>
        ) : (
          data && (
            <div className={`space-y-5 transition-opacity ${loading ? "opacity-50" : ""}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <Kpi
                  definition="Total cobrado por las ventas del período, después de descuentos."
                  delta={variacion(data.actual.ventas, data.anterior.ventas)}
                  hint={`${data.actual.numeroVentas} ${data.actual.numeroVentas === 1 ? "venta" : "ventas"}`}
                  icon="heroicons:banknotes"
                  label="Ventas"
                  tone="primary"
                  value={bs(data.actual.ventas)}
                />
                <Kpi
                  definition="Lo que costó la mercadería que vendiste, con el costo promedio de tus compras. No es lo que compraste en el período, sino lo que salió vendido."
                  delta={variacion(data.actual.costoVentas, data.anterior.costoVentas)}
                  hint="Lo que costó lo que vendiste"
                  icon="heroicons:archive-box"
                  label="Costo de lo vendido"
                  neutralDelta
                  tone="neutral"
                  value={bs(data.actual.costoVentas)}
                />
                <Kpi
                  definition="Costo de la mercadería que llegó a su fecha de vencimiento sin venderse durante el período. Es plata que ya gastaste y no vas a recuperar."
                  delta={variacion(data.actual.perdidaVencimiento, data.anterior.perdidaVencimiento)}
                  hint={
                    data.vencidos.length > 0
                      ? `${data.vencidos.length} ${data.vencidos.length === 1 ? "lote vencido" : "lotes vencidos"}`
                      : "Nada se venció"
                  }
                  icon="heroicons:no-symbol"
                  label="Pérdida por vencimiento"
                  tone={data.actual.perdidaVencimiento > 0 ? "danger" : "neutral"}
                  upIsGood={false}
                  value={bs(data.actual.perdidaVencimiento)}
                />
                <Kpi
                  definition="Ventas − costo de lo vendido − mercadería vencida. Todavía no descuenta los gastos del local (luz, alquiler, sueldos), que no se registran en el sistema."
                  delta={variacion(data.actual.utilidad, data.anterior.utilidad)}
                  hint={`Margen ${pct(data.actual.margen)} sobre lo vendido`}
                  icon="heroicons:chart-bar"
                  label="Utilidad"
                  tone={data.actual.utilidad >= 0 ? "success" : "danger"}
                  value={bs(data.actual.utilidad)}
                />
                <Kpi
                  definition="Mercadería que compraste en el período. No es una pérdida: queda en tu almacén o estante hasta que se venda."
                  delta={variacion(data.actual.compras, data.anterior.compras)}
                  hint="Inversión en inventario"
                  icon="heroicons:shopping-cart"
                  label="Compras del período"
                  neutralDelta
                  tone="secondary"
                  value={bs(data.actual.compras)}
                />
                <Kpi
                  definition="Ventas menos compras. Es un dato de caja: te dice si el efectivo alcanzó, no si ganaste."
                  delta={variacion(data.actual.efectivoNeto, data.anterior.efectivoNeto)}
                  hint="Ventas − compras (solo caja)"
                  icon="heroicons:wallet"
                  label="Efectivo neto"
                  neutralDelta
                  tone="neutral"
                  value={bs(data.actual.efectivoNeto)}
                />
              </div>

              <Insights items={insights} />

              <ChartCard
                empty={sinVentas}
                subtitle="Cómo se reparte lo que vendiste"
                title="¿A dónde fue lo que vendiste?"
              >
                <SplitBar
                  remainder={{
                    label: data.actual.utilidad >= 0 ? "Te quedó (utilidad)" : "Te faltó",
                    value: data.actual.utilidad,
                    color: data.actual.utilidad >= 0 ? COLORS.ventas : COLORS.negativo,
                  }}
                  segments={[
                    {
                      label: "Costo de lo vendido",
                      value: data.actual.costoVentas,
                      color: COLORS.compras,
                      note: "pagaron la mercadería que vendiste",
                    },
                    ...(data.actual.perdidaVencimiento > 0
                      ? [
                          {
                            label: "Se venció",
                            value: data.actual.perdidaVencimiento,
                            color: COLORS.negativo,
                            note: "se perdieron por mercadería vencida",
                          },
                        ]
                      : []),
                  ]}
                  total={data.actual.ventas}
                  totalLabel="Vendiste"
                />
              </ChartCard>

              <ChartCard
                empty={sinMovimiento}
                legend={[
                  { label: "Ventas acumuladas", color: COLORS.ventas },
                  { label: "Compras acumuladas", color: COLORS.compras },
                ]}
                subtitle="Suma día a día. Si la línea naranja sube más rápido que la azul, estás invirtiendo en mercadería más rápido de lo que la vendes"
                title="Lo que entró y lo que salió, acumulado"
              >
                {acumulado && <BaseChart height="300px" option={acumulado} />}
              </ChartCard>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ChartCard
                  empty={data.ventasPorCategoria.length === 0}
                  subtitle="Qué categorías generan tus ingresos"
                  title="Ventas por categoría"
                >
                  <BaseChart
                    height={`${Math.max(180, data.ventasPorCategoria.length * 42 + 20)}px`}
                    option={hBarOption(
                      data.ventasPorCategoria.map((c) => ({ name: c.categoria, value: c.total })),
                      { color: COLORS.ventas },
                    )}
                  />
                </ChartCard>

                <ChartCard
                  empty={data.comprasPorProveedor.length === 0}
                  emptyText="No hay compras en este rango de fechas."
                  subtitle="A quién le estás comprando más"
                  title="Compras por proveedor"
                >
                  <BaseChart
                    height={`${Math.max(180, data.comprasPorProveedor.length * 42 + 20)}px`}
                    option={hBarOption(
                      data.comprasPorProveedor.map((p) => ({ name: p.proveedor, value: p.total })),
                      { color: COLORS.compras },
                    )}
                  />
                </ChartCard>
              </div>

              {data.vencidos.length > 0 && (
                <div className="rounded-2xl bg-white border border-default-200 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-bold text-base leading-tight">Mercadería que se venció</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Lotes que llegaron a su fecha de vencimiento con unidades sin vender. Se valoran a lo que te costaron.
                      </p>
                    </div>
                    <p className="text-lg font-bold text-red-600 tabular-nums shrink-0">
                      {bs(data.actual.perdidaVencimiento)}
                    </p>
                  </div>
                  <div className="divide-y divide-default-100">
                    {data.vencidos.map((v) => (
                      <div key={`${v.producto}-${v.lote}`} className="py-2.5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                          <Icon height="18" icon="heroicons:no-symbol" width="18" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{v.producto}</p>
                          <p className="text-xs text-gray-500">
                            Lote {v.lote} · venció el {fechaEs(v.venciO)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-red-600 tabular-nums">{bs(v.costo)}</p>
                          <p className="text-xs text-gray-500">{num(v.unidades, v.unidades % 1 ? 1 : 0)} unid. sin vender</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500 px-1">
                Utilidad = ventas − costo de lo vendido − mercadería vencida. No incluye gastos del local (luz, alquiler,
                sueldos): esos no se registran en el sistema. Las variaciones comparan con los {data.rango.dias} días
                anteriores.
              </p>
            </div>
          )
        )}
      </div>
    </ProtectedRoute>
  );
}
