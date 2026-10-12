"use client";

import { Chip, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import React, { useEffect, useMemo, useState } from "react";

import { AlmacenData, getWarehouseInventory, ProductoAlmacen } from "@/actions/reportes/reporte-almacen";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import BaseChart from "@/components/dashboard/BaseChart";
import ChartCard from "@/components/reports/ChartCard";
import { COLORS, columnasOption, hBarOption } from "@/components/reports/chart-options";
import Insights, { Insight } from "@/components/reports/Insights";
import Kpi from "@/components/reports/Kpi";
import ReportHeader from "@/components/reports/ReportHeader";
import SplitBar from "@/components/reports/SplitBar";
import { bs, num } from "@/src/utils/report-format";

const dias = (n: number) => `${num(n, n < 10 ? 1 : 0)} días`;

function buildInsights(d: AlmacenData): Insight[] {
  const t = d.totales;
  const items: Insight[] = [];

  if (d.productos.every((p) => p.total <= 0)) {
    return [{ tone: "warn", text: "No hay mercadería en el almacén ni en el estante." }];
  }

  const reponer = d.productos.filter((p) => p.estado !== "ok" && p.reponer > 0);

  if (reponer.length > 0) {
    const criticos = reponer.filter((p) => p.cobertura !== null && p.cobertura < 7);

    items.push({
      tone: "warn",
      text: `${reponer.length} ${reponer.length === 1 ? "producto está" : "productos están"} por debajo de su mínimo${
        criticos.length ? `; ${criticos.length} se acabarían en menos de una semana al ritmo actual` : ""
      }. Revisa la lista “Qué comprar”.`,
    });
  }

  if (t.valorVencidoSinRetirar > 0) {
    items.push({
      tone: "warn",
      text: `Hay mercadería vencida por ${bs(t.valorVencidoSinRetirar)} que sigue registrada como stock. Retírala físicamente: ya no se puede vender ni pasar al estante.`,
    });
  }

  if (t.valorPorVencer > 0) {
    items.push({
      tone: "warn",
      text: `${bs(t.valorPorVencer)} de mercadería vence en los próximos 30 días. Ponla en el estante primero o haz una promoción para no perderla.`,
    });
  }

  if (t.valorParado > 0) {
    items.push({
      tone: "info",
      text: `${bs(t.valorParado)} están en productos que no vendiste en ${d.diasRitmo} días. No compres más de esos hasta que se muevan.`,
    });
  }

  if (items.length === 0) {
    items.push({ tone: "good", text: "El almacén está sano: nada por vencer, nada parado y ningún producto bajo su mínimo." });
  }

  return items;
}

function Fila({ p, d }: { p: ProductoAlmacen; d: AlmacenData }) {
  const sin = p.estado === "sin";
  const critico = p.cobertura !== null && p.cobertura < 7;

  return (
    <div className="rounded-2xl border border-default-200 bg-white shadow-sm p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            sin ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
          }`}
        >
          <Icon height="22" icon={sin ? "heroicons:archive-box-x-mark" : "heroicons:arrow-trending-down"} width="22" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold">{p.nombre}</p>
            <Chip color="secondary" size="sm" variant="flat">
              {p.categoria}
            </Chip>
            <Chip color={sin ? "danger" : "warning"} size="sm" variant="flat">
              {sin ? "Sin stock" : critico ? "Se acaba pronto" : "Bajo el mínimo"}
            </Chip>
          </div>
          <p className="text-sm text-gray-700 mt-1.5">
            Tienes {num(p.total, p.total % 1 ? 1 : 0)} {p.unidadBase} (almacén {num(p.almacen, p.almacen % 1 ? 1 : 0)} ·
            estante {num(p.estante, p.estante % 1 ? 1 : 0)}) y tu mínimo es {num(p.minimo, p.minimo % 1 ? 1 : 0)}.
            {p.cobertura !== null && ` Al ritmo actual alcanza para ${dias(p.cobertura)}.`}
            {p.cobertura === null && !sin && ` No se vendió en los últimos ${d.diasRitmo} días.`}
          </p>
          {p.reponer > 0 && (
            <p className="text-sm text-secondary-800 bg-secondary-50 rounded-lg px-3 py-2 mt-2">
              <b>Qué comprar:</b> unas {num(p.reponer)} {p.unidadBase}
              {p.costoUnidad > 0 && <> (≈ {bs(p.reponer * p.costoUnidad, 0)})</>} para cubrir {d.diasObjetivo} días de
              venta.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WarehouseInventoryReport() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AlmacenData | null>(null);

  useEffect(() => {
    getWarehouseInventory()
      .then((res) => {
        if (res.success && res.data) setData(res.data);
        else setError(res.error || "No se pudo cargar el reporte");
      })
      .catch(() => setError("No se pudo conectar con el servidor"))
      .finally(() => setLoading(false));
  }, []);

  const insights = useMemo(() => (data ? buildInsights(data) : []), [data]);

  const porCategoria = useMemo(
    () => (data ? hBarOption(data.categorias.map((c) => ({ name: c.categoria, value: c.valor })), { color: COLORS.ventas }) : null),
    [data],
  );

  const semanas = useMemo(
    () =>
      data
        ? columnasOption(
            data.vencimientosSemana.map((s) => ({
              name: s.etiqueta,
              value: s.valor,
              detail: s.lotes ? `${s.lotes} ${s.lotes === 1 ? "lote" : "lotes"}` : undefined,
            })),
            { color: COLORS.compras },
          )
        : null,
    [data],
  );

  const cobertura = useMemo(() => {
    if (!data) return null;
    const filas = data.productos
      .filter((p) => p.cobertura !== null && p.total > 0)
      .sort((a, b) => a.cobertura! - b.cobertura!)
      .slice(0, 10)
      .map((p) => ({ name: p.nombre, value: p.cobertura! }));

    return filas.length ? hBarOption(filas, { color: COLORS.traslado, format: dias }) : null;
  }, [data]);

  const parados = useMemo(() => data?.productos.filter((p) => p.parado) ?? [], [data]);
  const aReponer = useMemo(() => data?.productos.filter((p) => p.estado !== "ok" && p.reponer > 0) ?? [], [data]);
  const hayStock = data ? data.totales.productosConStock > 0 : false;
  const hayVencimientos = data ? data.vencimientosSemana.some((s) => s.valor > 0) : false;

  return (
    <ProtectedRoute allowedRoles={[1, 4]}>
      <div className="p-4 md:p-8 space-y-5">
        <ReportHeader
          crumb="Almacén de productos"
          question="¿Cuánto tengo, cuánto me dura, qué se me va a vencer y qué debo comprar?"
          snapshotNote="Es una foto de hoy, por eso no tiene rango de fechas. Los valores usan el costo promedio de compra; el ritmo de venta sale de los últimos 30 días."
          title="Almacén de productos"
        />

        {error && <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 text-sm p-4">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-24">
            <Spinner label="Calculando..." size="lg" />
          </div>
        ) : (
          data && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Kpi
                  definition="Lo que te costó la mercadería que todavía tienes (almacén + estante), al costo promedio de compra. Es plata parada en producto."
                  hint={`${data.totales.productosConStock} productos con stock`}
                  icon="heroicons:banknotes"
                  label="Capital en inventario"
                  value={bs(data.totales.valor)}
                />
                <Kpi
                  definition="Productos cuyo stock (almacén + estante) es menor al mínimo que definiste en cada producto."
                  hint={`${data.totales.sinStock} sin stock · ${data.totales.bajo} bajo el mínimo`}
                  icon="heroicons:arrow-trending-down"
                  label="Por reponer"
                  tone={aReponer.length ? "danger" : "success"}
                  value={String(data.totales.sinStock + data.totales.bajo)}
                />
                <Kpi
                  definition="Costo de la mercadería que vence en los próximos 30 días y aún no se vendió."
                  hint="Vence en 30 días o menos"
                  icon="heroicons:clock"
                  label="En riesgo de vencer"
                  tone={data.totales.valorPorVencer > 0 ? "danger" : "success"}
                  value={bs(data.totales.valorPorVencer)}
                />
                <Kpi
                  definition={`Costo del stock de productos que no tuvieron ninguna venta en los últimos ${data.diasRitmo} días.`}
                  hint={`${parados.length} productos sin movimiento`}
                  icon="heroicons:pause-circle"
                  label="Dinero parado"
                  tone={data.totales.valorParado > 0 ? "secondary" : "success"}
                  value={bs(data.totales.valorParado)}
                />
              </div>

              <Insights items={insights} />

              <div className="rounded-2xl bg-white border border-default-200 shadow-sm p-5">
                <h3 className="font-bold text-base">¿Dónde está la mercadería?</h3>
                <p className="text-xs text-gray-500 mb-4">Lo que ya está listo para vender y lo que sigue en bodega.</p>
                <SplitBar
                  remainder={{
                    label: "Ya en el estante",
                    value: data.totales.valorEstante,
                    color: COLORS.ventas,
                    note: "Listo para vender",
                  }}
                  segments={[
                    {
                      label: "En el almacén",
                      value: data.totales.valorAlmacen,
                      color: COLORS.compras,
                      note: "Falta pasarlo al estante",
                    },
                  ]}
                  total={data.totales.valor}
                  totalLabel="Capital en inventario"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ChartCard
                  empty={!hayVencimientos}
                  emptyText="Nada vence en las próximas 8 semanas."
                  subtitle="Costo de lo que vence en cada semana. Lo más urgente está a la izquierda"
                  title="¿Cuándo se me vence?"
                >
                  {semanas && <BaseChart height="300px" option={semanas} />}
                </ChartCard>

                <ChartCard
                  empty={!cobertura}
                  emptyText="Todavía no hay ventas para calcular cuánto dura cada producto."
                  subtitle="Días que alcanza el stock al ritmo de venta de los últimos 30 días. Arriba, los que se acaban primero"
                  title="¿Cuánto me dura?"
                >
                  {cobertura && <BaseChart height="300px" option={cobertura} />}
                </ChartCard>
              </div>

              <ChartCard
                empty={!hayStock}
                subtitle="Cuánta plata tienes parada en cada categoría"
                title="Capital por categoría"
              >
                {porCategoria && (
                  <BaseChart height={`${Math.max(180, data.categorias.length * 42 + 20)}px`} option={porCategoria} />
                )}
              </ChartCard>

              {aReponer.length > 0 && (
                <div className="space-y-3">
                  <div className="px-1">
                    <h3 className="font-bold text-base">Qué comprar</h3>
                    <p className="text-xs text-gray-500">
                      Productos sin stock o bajo su mínimo, del más urgente al menos urgente.
                    </p>
                  </div>
                  {[...aReponer]
                    .sort((a, b) => (a.cobertura ?? 9999) - (b.cobertura ?? 9999))
                    .map((p) => (
                      <Fila key={p.id} d={data} p={p} />
                    ))}
                </div>
              )}

              {data.vencidos.length > 0 && (
                <div className="space-y-3">
                  <div className="px-1">
                    <h3 className="font-bold text-base">Vencido que sigue en el sistema</h3>
                    <p className="text-xs text-gray-500">Retíralo del almacén o del estante: no se puede vender.</p>
                  </div>
                  {data.vencidos.map((v) => (
                    <div
                      key={`${v.producto}-${v.lote}`}
                      className="rounded-2xl border border-red-200 bg-red-50/50 p-4 flex items-center gap-4"
                    >
                      <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                        <Icon height="22" icon="heroicons:no-symbol" width="22" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{v.producto}</p>
                        <p className="text-sm text-gray-600">
                          Lote {v.lote} · venció el {v.vencio.split("-").reverse().join("/")} · quedan {num(v.unidades, v.unidades % 1 ? 1 : 0)}{" "}
                          {v.unidadBase}
                        </p>
                      </div>
                      <p className="font-bold text-red-600 tabular-nums">{bs(v.valor)}</p>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-500 px-1">
                Stock mínimo: se define en cada producto. Cobertura = stock ÷ venta diaria promedio. “Qué comprar” sugiere
                llegar a {data.diasObjetivo} días de venta (o al mínimo, lo que sea mayor).
              </p>
            </div>
          )
        )}
      </div>
    </ProtectedRoute>
  );
}
