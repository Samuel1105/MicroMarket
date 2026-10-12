"use client";

import { Chip, Input, Pagination, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import React, { useEffect, useMemo, useState } from "react";

import { getProductProfitability, ProductoRentabilidad, RentabilidadData } from "@/actions/reportes/reporte-rentabilidad";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import BaseChart from "@/components/dashboard/BaseChart";
import ChartCard from "@/components/reports/ChartCard";
import { barrasUtilidadOption } from "@/components/reports/chart-options";
import Insights, { Insight } from "@/components/reports/Insights";
import Kpi from "@/components/reports/Kpi";
import ReportHeader, { ReportRange } from "@/components/reports/ReportHeader";
import { formatRangoEs, getCurrentMonthRange } from "@/src/utils/report-dates";
import { bs, num, pct, variacion } from "@/src/utils/report-format";

const POR_PAGINA = 8;
/** Cuántos productos caben en la gráfica antes de resumir en "los que más" y "los que menos" */
const MAX_EN_GRAFICA = 10;

type Filtro = "todos" | "revisar" | "ok";

function buildInsights(d: RentabilidadData): Insight[] {
  const a = d.actual;
  const items: Insight[] = [];

  if (d.productos.length === 0 || a.ingresos === 0) {
    items.push({
      tone: "warn",
      text: `No hay ventas registradas entre ${formatRangoEs(d.rango.start, d.rango.end)}. Prueba con otro rango de fechas.`,
    });

    return items;
  }

  if (a.utilidad < 0) {
    items.push({
      tone: "warn",
      text: `En este período tus productos dejaron una pérdida de ${bs(Math.abs(a.utilidad))} entre lo vendido y lo vencido.`,
    });
  } else {
    items.push({
      tone: "good",
      text: `Tus productos dejaron ${bs(a.utilidad)} de utilidad: un margen real de ${pct(a.margen)} sobre ${bs(a.ingresos)} vendidos.`,
    });
  }

  const mejor = d.productos[0];

  if (mejor && mejor.utilidad > 0 && a.utilidad > 0) {
    items.push({
      tone: "info",
      text: `${mejor.nombre} es el que más deja: ${bs(mejor.utilidad)}, el ${pct((mejor.utilidad / a.utilidad) * 100, 0)} de tu utilidad.`,
    });
  }

  for (const p of d.aRevisar.filter((x) => x.estado === "pierde").slice(0, 2)) {
    items.push({ tone: "warn", text: `${p.nombre}: ${p.motivo}` });
  }

  const peorCat = [...d.categorias].sort((x, y) => x.utilidad - y.utilidad)[0];

  if (peorCat && peorCat.utilidad < 0) {
    items.push({ tone: "warn", text: `La categoría ${peorCat.categoria} está en pérdida: ${bs(peorCat.utilidad)}.` });
  }

  return items;
}

function porQue(p: ProductoRentabilidad, altoVolumen: boolean, altoMargen: boolean): string {
  let base: string;

  if (p.utilidad < 0) base = p.motivo ?? "Perdiste dinero con este producto.";
  else if (altoVolumen && altoMargen) base = "Es de los que más vendes y, además, cada unidad te deja una buena ganancia.";
  else if (!altoVolumen && altoMargen) base = "Cada unidad te deja bastante, pero vendes poco. Si lo vendes más, ganarías más.";
  else if (altoVolumen && !altoMargen) base = "Es de los que más vendes, pero cada unidad te deja poca ganancia.";
  else base = "Vendes poco y deja poco por unidad: pesa poco en tus ganancias.";

  if (p.utilidad >= 0 && p.perdidaVencimiento > 0) {
    base += ` Ojo: se venció mercadería por ${bs(p.perdidaVencimiento)} y eso ya está restado.`;
  }

  return base;
}

function FilaProducto({
  p,
  posicion,
  abierto,
  onToggle,
  margenGeneral,
  altoVolumen,
}: {
  p: ProductoRentabilidad;
  posicion: number;
  abierto: boolean;
  onToggle: () => void;
  margenGeneral: number;
  altoVolumen: boolean;
}) {
  const pierde = p.estado === "pierde";
  const poco = p.estado === "revisar";

  return (
    <div className="rounded-2xl border border-default-200 bg-white shadow-sm">
      <button
        aria-expanded={abierto}
        className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 text-left"
        type="button"
        onClick={onToggle}
      >
        <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-700 font-bold text-sm flex items-center justify-center shrink-0">
          {posicion}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold truncate">{p.nombre}</p>
            <span className="hidden sm:inline">
              <Chip color="secondary" size="sm" variant="flat">
                {p.categoria}
              </Chip>
            </span>
            {pierde && (
              <Chip color="danger" size="sm" variant="flat">
                Pierdes dinero
              </Chip>
            )}
            {poco && (
              <Chip color="warning" size="sm" variant="flat">
                Deja poco
              </Chip>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {num(p.unidades, p.unidades % 1 ? 1 : 0)} unid. vendidas · {bs(p.ingresos, 0)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={`font-bold tabular-nums ${p.utilidad < 0 ? "text-red-600" : "text-gray-900"}`}>
            {bs(p.utilidad, 0)}
          </p>
          <p className="text-xs text-gray-500">{pct(p.margen, 0)} de margen</p>
        </div>
        <Icon
          className={`text-gray-400 shrink-0 transition-transform ${abierto ? "rotate-180" : ""}`}
          height="18"
          icon="heroicons:chevron-down"
          width="18"
        />
      </button>

      {abierto && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 space-y-2 border-t border-default-100">
          <p className="text-sm text-gray-700 mt-3">
            <b>¿Por qué?</b> {porQue(p, altoVolumen, p.margenBruto >= margenGeneral)}
          </p>
          {p.unidades > 0 && (
            <p className="text-xs text-gray-500">
              Te cuesta {bs(p.costoUnidad)} y lo vendes a {bs(p.precioPromedio)}: te quedan {bs(p.gananciaUnidad)} por unidad (
              {pct(p.margenBruto, 0)}).
            </p>
          )}
          {p.precioSugerido && p.utilidadExtra && p.utilidadExtra > 0 && (
            <p className="text-sm text-secondary-800 bg-secondary-50 rounded-lg px-3 py-2">
              <b>Una opción:</b> si lo subes de {bs(p.precioPromedio)} a {bs(p.precioSugerido)}, tu margen llega al mínimo
              (15%).
            </p>
          )}
          {pierde && p.perdidaVencimiento > 0 && (
            <p className="text-sm text-secondary-800 bg-secondary-50 rounded-lg px-3 py-2">
              <b>Qué hacer:</b> compra menos cantidad cada vez o ponlo en promoción antes de que venza.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Con muchos productos, la gráfica muestra los que más y los que menos dejan (nunca crece sin límite) */
function extremos<T>(orden: T[]): T[] {
  if (orden.length <= MAX_EN_GRAFICA) return orden;
  const mitad = MAX_EN_GRAFICA / 2;

  return [...orden.slice(0, mitad), ...orden.slice(-mitad)];
}

export default function ProductProfitabilityAnalysis() {
  const [range, setRange] = useState<ReportRange>(getCurrentMonthRange());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RentabilidadData | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [abierto, setAbierto] = useState<number | null>(null);

  useEffect(() => {
    let cancelado = false;

    setLoading(true);
    setError(null);
    getProductProfitability({ startDate: range.start, endDate: range.end })
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

  useEffect(() => {
    setPagina(1);
    setAbierto(null);
  }, [filtro, busqueda, range.start, range.end]);

  const insights = useMemo(() => (data ? buildInsights(data) : []), [data]);

  const porVentas = useMemo(
    () => (data ? [...data.productos].sort((a, b) => b.ingresos - a.ingresos).map((p) => p.id) : []),
    [data],
  );

  const utilidadProductos = useMemo(() => {
    if (!data) return null;
    const filas = extremos(
      data.productos.map((p) => ({
        name: p.nombre,
        value: p.utilidad,
        detail:
          `Ventas − costo: ${bs(p.utilidadBruta)}` +
          (p.perdidaVencimiento > 0 ? `<br/>Se venció: −${bs(p.perdidaVencimiento)}` : "") +
          `<br/><b>Utilidad: ${bs(p.utilidad)}</b>`,
      })),
    );

    return barrasUtilidadOption(filas);
  }, [data]);

  const utilidadCategorias = useMemo(
    () =>
      data
        ? barrasUtilidadOption(extremos(data.categorias.map((c) => ({ name: c.categoria, value: c.utilidad }))))
        : null,
    [data],
  );

  const conteos = useMemo(() => {
    const todos = data?.productos ?? [];

    return {
      todos: todos.length,
      revisar: todos.filter((p) => p.estado !== "ok").length,
      ok: todos.filter((p) => p.estado === "ok").length,
    };
  }, [data]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return (data?.productos ?? []).filter(
      (p) =>
        (filtro === "todos" || (filtro === "revisar" ? p.estado !== "ok" : p.estado === "ok")) &&
        (!q || p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q)),
    );
  }, [data, filtro, busqueda]);

  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const visibles = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const sinVentas = data ? data.actual.ingresos === 0 : false;
  const hayRevisar = data ? data.aRevisar.length > 0 : false;
  const resumido = data ? data.productos.length > MAX_EN_GRAFICA : false;

  const FILTROS: { key: Filtro; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "revisar", label: "A revisar" },
    { key: "ok", label: "Van bien" },
  ];

  return (
    <ProtectedRoute allowedRoles={[1]}>
      <div className="p-4 md:p-8 space-y-5">
        <ReportHeader
          crumb="Rentabilidad"
          question="¿Qué productos son los más rentables? ¿Cuáles se venden pero dejan poca utilidad?"
          range={range}
          title="Rentabilidad por producto"
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
                  definition="Ventas − costo de lo vendido − mercadería vencida, sumando todos los productos. Es la misma cifra del Estado financiero (antes de gastos del local)."
                  delta={variacion(data.actual.utilidad, data.anterior.utilidad)}
                  hint={`Sobre ${bs(data.actual.ingresos)} vendidos`}
                  icon="heroicons:banknotes"
                  label="Utilidad"
                  tone={data.actual.utilidad >= 0 ? "success" : "danger"}
                  value={bs(data.actual.utilidad)}
                />
                <Kpi
                  definition="Utilidad total ÷ ventas totales. Es el margen de todo tu negocio; un producto grande pesa más que uno pequeño (no es un promedio simple de márgenes)."
                  hint={`Período anterior: ${pct(data.anterior.margen)}`}
                  icon="heroicons:receipt-percent"
                  label="Margen real"
                  tone="primary"
                  value={pct(data.actual.margen)}
                />
                <Kpi
                  definition={`Productos que pierden dinero o dejan menos de ${data.margenMinimo}% de margen.`}
                  hint={`Margen menor a ${data.margenMinimo}% o en pérdida`}
                  icon="heroicons:exclamation-triangle"
                  label="Productos a revisar"
                  tone={hayRevisar ? "danger" : "success"}
                  value={`${data.aRevisar.length} de ${data.productos.length}`}
                />
                <Kpi
                  definition="Costo de la mercadería que llegó a su fecha de vencimiento sin venderse durante el período."
                  delta={variacion(data.actual.perdidaVencimiento, data.anterior.perdidaVencimiento)}
                  hint="Ya está descontada de la utilidad"
                  icon="heroicons:no-symbol"
                  label="Pérdida por vencimiento"
                  tone={data.actual.perdidaVencimiento > 0 ? "danger" : "neutral"}
                  upIsGood={false}
                  value={bs(data.actual.perdidaVencimiento)}
                />
              </div>

              <Insights items={insights} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ChartCard
                  empty={sinVentas}
                  subtitle={
                    resumido
                      ? `Los ${MAX_EN_GRAFICA / 2} que más y los ${MAX_EN_GRAFICA / 2} que menos dejaron. La lista completa está abajo`
                      : "Cuánto dejó cada producto (ventas − costo − lo que se venció). En rojo, los que te hicieron perder"
                  }
                  title="Ganancia por producto"
                >
                  {utilidadProductos && (
                    <BaseChart
                      height={`${Math.max(220, Math.min(data.productos.length, MAX_EN_GRAFICA) * 38 + 20)}px`}
                      option={utilidadProductos}
                    />
                  )}
                </ChartCard>

                <ChartCard
                  empty={sinVentas || data.categorias.length === 0}
                  subtitle={
                    data.categorias.length > MAX_EN_GRAFICA
                      ? "Las categorías que más y que menos dejaron"
                      : "Cuánto dejó cada grupo de productos"
                  }
                  title="Ganancia por categoría"
                >
                  {utilidadCategorias && (
                    <BaseChart
                      height={`${Math.max(220, Math.min(data.categorias.length, MAX_EN_GRAFICA) * 38 + 20)}px`}
                      option={utilidadCategorias}
                    />
                  )}
                </ChartCard>
              </div>

              {!sinVentas && (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-white border border-default-200 shadow-sm p-4 sm:p-5">
                    <h3 className="font-bold text-base">Todos los productos, del más al menos rentable</h3>
                    <p className="text-xs text-gray-500">
                      “Utilidad” es lo que queda después de restar lo que te costó y lo que se venció. Toca un producto
                      para ver por qué.
                    </p>
                    <div className="mt-4 flex flex-col md:flex-row md:items-center gap-3">
                      <Input
                        className="md:max-w-xs"
                        isClearable
                        placeholder="Buscar producto o categoría"
                        size="sm"
                        startContent={<Icon height="18" icon="heroicons:magnifying-glass" width="18" />}
                        value={busqueda}
                        variant="bordered"
                        onClear={() => setBusqueda("")}
                        onValueChange={setBusqueda}
                      />
                      <div className="flex flex-wrap gap-2">
                        {FILTROS.map((f) => (
                          <button
                            key={f.key}
                            aria-pressed={filtro === f.key}
                            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                              filtro === f.key
                                ? "bg-primary-500 border-primary-500 text-white"
                                : "bg-white border-default-200 text-gray-600 hover:border-primary-300 hover:text-primary-700"
                            }`}
                            type="button"
                            onClick={() => setFiltro(f.key)}
                          >
                            {f.label} ({conteos[f.key]})
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {visibles.length === 0 ? (
                    <div className="rounded-2xl bg-white border border-default-200 p-8 text-center text-sm text-gray-400">
                      Ningún producto coincide con lo que buscas.
                    </div>
                  ) : (
                    visibles.map((p) => (
                      <FilaProducto
                        key={p.id}
                        abierto={abierto === p.id}
                        altoVolumen={porVentas.indexOf(p.id) < Math.ceil(data.productos.length / 3)}
                        margenGeneral={data.actual.margen}
                        p={p}
                        posicion={data.productos.indexOf(p) + 1}
                        onToggle={() => setAbierto(abierto === p.id ? null : p.id)}
                      />
                    ))
                  )}

                  {paginas > 1 && (
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <p className="text-xs text-gray-500">
                        {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, filtrados.length)} de{" "}
                        {filtrados.length}
                      </p>
                      <Pagination color="primary" page={pagina} showControls size="sm" total={paginas} onChange={setPagina} />
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-gray-500 px-1">
                Margen = utilidad ÷ ventas. El costo es el promedio de lo que pagaste por cada producto, con la misma forma
                de cálculo del Estado financiero. Las variaciones comparan con los {data.rango.dias} días anteriores.
              </p>
            </div>
          )
        )}
      </div>
    </ProtectedRoute>
  );
}
