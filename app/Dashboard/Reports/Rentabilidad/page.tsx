"use client";

import { Chip } from "@heroui/react";
import React, { useMemo, useState } from "react";

import { getFinanzasDatos, getVentasDatos } from "@/actions/reportes/datos-reportes";
import ChartPanel from "@/components/reports/kit/ChartPanel";
import FilterBar, { FilterDim, Filters } from "@/components/reports/kit/FilterBar";
import KpiAnimado from "@/components/reports/kit/KpiAnimado";
import PaginaReporte from "@/components/reports/kit/PaginaReporte";
import Segmented from "@/components/reports/kit/Segmented";
import TablaBuscable, { Columna } from "@/components/reports/kit/TablaBuscable";
import { mapaColores } from "@/components/reports/kit/colores";
import { base, FONT, MUTED, tipHtml, tooltipBase, valueAxis } from "@/components/reports/kit/chart-kit";
import { opcionBarrasH } from "@/components/reports/kit/opciones";
import { useReporte } from "@/components/reports/kit/useReporte";
import { agrupar, expandir, filtrarVentas } from "@/components/reports/kit/ventas";
import { ReportRange } from "@/components/reports/ReportHeader";
import { MARGEN_MINIMO } from "@/src/lib/report-config";
import { getCurrentMonthRange } from "@/src/utils/report-dates";
import { bs, num, pct, variacion } from "@/src/utils/report-format";

type Estado = "pierde" | "revisar" | "ok";

type Prod = {
  nombre: string;
  categoria: string;
  unidades: number;
  ingresos: number;
  costo: number;
  perdida: number;
  utilidad: number;
  margenBruto: number;
  margen: number;
  precio: number;
  costoUnidad: number;
  estado: Estado;
};

const ESTADO: Record<Estado, { label: string; color: string; chip: "success" | "warning" | "danger" }> = {
  ok: { label: "Bien", color: "#1baf7a", chip: "success" },
  revisar: { label: "Revisar precio", color: "#eda100", chip: "warning" },
  pierde: { label: "Pierde plata", color: "#e34948", chip: "danger" },
};

export default function ProfitabilityReport() {
  const [range, setRange] = useState<ReportRange>(getCurrentMonthRange());
  const ventasQ = useReporte(getVentasDatos, range);
  const finQ = useReporte(getFinanzasDatos, range);
  const data = ventasQ.data;
  const fin = finQ.data;
  const loading = ventasQ.loading || finQ.loading;
  const [filtros, setFiltros] = useState<Filters>({});
  const [topN, setTopN] = useState<10 | 20>(10);
  const [vista, setVista] = useState<"utilidad" | "margen">("utilidad");

  const { filas, previas } = useMemo(() => (data ? expandir(data) : { filas: [], previas: [] }), [data]);
  const fil = useMemo(() => filtrarVentas(filas, filtros), [filas, filtros]);
  const filPrev = useMemo(() => filtrarVentas(previas, filtros), [previas, filtros]);
  const colorCat = useMemo(() => mapaColores((data?.productos ?? []).map((p) => p.categoria)), [data]);

  const pasaFiltro = (producto: string, categoria: string) =>
    (!filtros.producto?.length || filtros.producto.includes(producto)) && (!filtros.categoria?.length || filtros.categoria.includes(categoria));
  const vencidos = useMemo(() => (fin?.vencidos ?? []).filter((v) => pasaFiltro(v.producto, v.categoria)), [fin, filtros]); // eslint-disable-line react-hooks/exhaustive-deps
  const vencidosPrev = useMemo(() => (fin?.vencidosPrev ?? []).filter((v) => pasaFiltro(v.producto, v.categoria)), [fin, filtros]); // eslint-disable-line react-hooks/exhaustive-deps

  const dims = useMemo<FilterDim[]>(
    () => [
      { key: "categoria", label: "Categoría", icon: "heroicons:tag", options: Array.from(new Set((data?.productos ?? []).map((p) => p.categoria))).sort((a, b) => a.localeCompare(b)) },
      { key: "producto", label: "Producto", icon: "heroicons:cube", options: Array.from(new Set((data?.productos ?? []).map((p) => p.nombre))).sort((a, b) => a.localeCompare(b)) },
    ],
    [data],
  );

  const alternar = (clave: string, valor: string) =>
    setFiltros((f) => {
      const actual = f[clave] ?? [];
      const n = { ...f };
      const lista = actual.includes(valor) ? actual.filter((x) => x !== valor) : [...actual, valor];

      if (lista.length) n[clave] = lista;
      else delete n[clave];

      return n;
    });

  // ── Por producto (incluye los que solo tuvieron pérdida por vencimiento) ──
  // FÓRMULAS (solo para el autor, no se muestran en pantalla):
  //   costo        = unidades vendidas × costo promedio ponderado de compra (por unidad base)   [getCostoPromedioBase]
  //   utilidadBruta = ingresos − costo                 margenBruto = utilidadBruta ÷ ingresos × 100
  //   utilidad      = utilidadBruta − perdida(vencido) margen      = utilidad ÷ ingresos × 100
  //   estado: utilidad < 0 → "pierde" · margenBruto < MARGEN_MINIMO → "revisar" · si no → "ok"
  //   MARGEN_MINIMO (15 %) es un valor propio del sistema, NO sale del documento (src/lib/report-config.ts)
  const productos = useMemo<Prod[]>(() => {
    const act = agrupar(fil, (x) => x.producto.nombre);
    const perdidas = new Map<string, { perdida: number; categoria: string }>();

    for (const v of vencidos) {
      const a = perdidas.get(v.producto) ?? { perdida: 0, categoria: v.categoria };

      a.perdida += v.costo;
      perdidas.set(v.producto, a);
    }

    const nombres = new Set([...act.keys(), ...perdidas.keys()]);

    return Array.from(nombres)
      .map((nombre) => {
        const a = act.get(nombre);
        const categoria = a?.filas[0].producto.categoria ?? perdidas.get(nombre)!.categoria;
        const ingresos = a?.importe ?? 0;
        const costo = a?.costo ?? 0;
        const unidades = a?.unidades ?? 0;
        const perdida = perdidas.get(nombre)?.perdida ?? 0;
        const utilidadBruta = ingresos - costo;
        const utilidad = utilidadBruta - perdida;
        const margenBruto = ingresos > 0 ? (utilidadBruta / ingresos) * 100 : 0;
        const precio = unidades > 0 ? ingresos / unidades : 0;
        const costoUnidad = unidades > 0 ? costo / unidades : 0;
        // Estado: pierde = la utilidad (ya restando lo vencido) es negativa; revisar = el margen bruto es menor al mínimo
        const estado: Estado = utilidad < 0 ? "pierde" : ingresos > 0 && margenBruto < MARGEN_MINIMO ? "revisar" : "ok";

        return { nombre, categoria, unidades, ingresos, costo, perdida, utilidad, margenBruto, margen: ingresos > 0 ? (utilidad / ingresos) * 100 : 0, precio, costoUnidad, estado };
      })
      .sort((a, b) => b.utilidad - a.utilidad);
  }, [fil, vencidos]);

  const totales = (rows: Prod[]) => {
    const ingresos = rows.reduce((s, p) => s + p.ingresos, 0);
    const costo = rows.reduce((s, p) => s + p.costo, 0);
    const perdida = rows.reduce((s, p) => s + p.perdida, 0);

    return { ingresos, costo, perdida, utilidad: ingresos - costo - perdida, margen: ingresos > 0 ? ((ingresos - costo - perdida) / ingresos) * 100 : 0 };
  };
  const t = totales(productos);
  const ingresosPrev = filPrev.reduce((s, x) => s + x.importe, 0);
  const costoPrev = filPrev.reduce((s, x) => s + x.costo, 0);
  const perdidaPrev = vencidosPrev.reduce((s, v) => s + v.costo, 0);
  const utilidadPrev = ingresosPrev - costoPrev - perdidaPrev;
  const aRevisar = productos.filter((p) => p.estado !== "ok");

  // ── Gráficos ──
  const ordenados = useMemo(
    () => [...productos].sort((a, b) => (vista === "utilidad" ? b.utilidad - a.utilidad : b.margen - a.margen)).slice(0, topN),
    [productos, vista, topN],
  );
  const opcionTop = useMemo(
    () =>
      opcionBarrasH({
        nombres: ordenados.map((p) => p.nombre),
        series: [{ name: vista === "utilidad" ? "Utilidad" : "Margen", color: "#1baf7a", valores: ordenados.map((p) => (vista === "utilidad" ? p.utilidad : p.margen)) }],
        colorPorBarra: ordenados.map((p) => ESTADO[p.estado].color),
        negativoRojo: true,
        fmt: (n) => (vista === "utilidad" ? bs(n, 0) : pct(n, 1)),
        seleccion: filtros.producto ?? [],
        pie: (nombre) => {
          const p = productos.find((x) => x.nombre === nombre);

          return p ? `Vendido ${bs(p.ingresos, 0)} · costo ${bs(p.costo, 0)} · ${ESTADO[p.estado].label}` : undefined;
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ordenados, vista, filtros.producto],
  );

  const conVentas = productos.filter((p) => p.ingresos > 0);
  const opcionDispersion = useMemo(
    () => ({
      ...base,
      grid: { left: 8, right: 24, top: 36, bottom: 36, containLabel: true },
      tooltip: {
        ...tooltipBase,
        trigger: "item",
        formatter: (p: any) => {
          const d = p.data.prod as Prod;

          return tipHtml(
            d.nombre,
            [
              { color: ESTADO[d.estado].color, name: "Vendido", value: bs(d.ingresos, 0) },
              { color: ESTADO[d.estado].color, name: "Margen", value: pct(d.margen, 1) },
              { color: ESTADO[d.estado].color, name: "Utilidad", value: bs(d.utilidad, 0) },
            ],
            ESTADO[d.estado].label,
          );
        },
      },
      xAxis: { ...valueAxis, name: "Cuánto vendes (Bs)", nameLocation: "middle", nameGap: 26, nameTextStyle: { color: MUTED, fontFamily: FONT, fontSize: 12 } },
      yAxis: {
        ...valueAxis,
        name: "Margen %",
        nameLocation: "end",
        nameGap: 14,
        nameTextStyle: { color: MUTED, fontFamily: FONT, fontSize: 12, align: "left" },
        axisLabel: { ...valueAxis.axisLabel, formatter: (v: number) => `${v}%` },
      },
      series: [
        {
          type: "scatter",
          data: conVentas.map((p) => ({
            value: [p.ingresos, p.margen],
            prod: p,
            symbolSize: Math.min(Math.max(Math.sqrt(Math.abs(p.utilidad)) * 2.2 + 12, 14), 54),
            itemStyle: {
              color: ESTADO[p.estado].color,
              opacity: filtros.producto?.length && !filtros.producto.includes(p.nombre) ? 0.25 : 0.85,
              borderColor: "#fff",
              borderWidth: 2,
            },
            label: { show: conVentas.length <= 14, formatter: p.nombre, position: "top", color: "#334155", fontSize: 11, fontFamily: FONT },
          })),
          emphasis: { scale: 1.15 },
          labelLayout: { hideOverlap: true },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { type: "dashed", color: "#94a3b8" },
            label: { formatter: "Deja poco", position: "insideEndTop", color: MUTED, fontFamily: FONT, fontSize: 11 },
            data: [{ yAxis: MARGEN_MINIMO }],
          },
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conVentas, filtros.producto],
  );

  const porCategoria = useMemo(() => {
    const m = new Map<string, number>();

    productos.forEach((p) => m.set(p.categoria, (m.get(p.categoria) ?? 0) + p.utilidad));

    return Array.from(m.entries())
      .map(([nombre, utilidad]) => ({ nombre, utilidad }))
      .sort((a, b) => b.utilidad - a.utilidad);
  }, [productos]);
  const opcionCat = useMemo(
    () =>
      opcionBarrasH({
        nombres: porCategoria.map((c) => c.nombre),
        series: [{ name: "Utilidad", color: "#1baf7a", valores: porCategoria.map((c) => c.utilidad) }],
        colorPorBarra: porCategoria.map((c) => colorCat(c.nombre)),
        negativoRojo: true,
        fmt: (n) => bs(n, 0),
        seleccion: filtros.categoria ?? [],
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [porCategoria, filtros.categoria],
  );

  // De cada 100 Bs que vendes
  const de100 = t.ingresos > 0 ? { costo: (t.costo / t.ingresos) * 100, perdida: (t.perdida / t.ingresos) * 100, utilidad: (t.utilidad / t.ingresos) * 100 } : null;
  const opcion100 = useMemo(
    () =>
      de100
        ? opcionBarrasH({
            nombres: ["De cada Bs 100 que vendes"],
            series: [
              { name: "Lo que costó la mercadería", color: "#eb6834", valores: [de100.costo] },
              { name: "Perdido por vencimiento", color: "#6250d6", valores: [Math.max(de100.perdida, 0)] },
              { name: "Te queda de utilidad", color: "#1baf7a", valores: [Math.max(de100.utilidad, 0)] },
            ],
            fmt: (n) => bs(n, 1),
            etiqueta: () => "Bs 100",
            maximo: 100,
          })
        : {},
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [de100?.costo, de100?.perdida, de100?.utilidad],
  );

  const columnas: Columna<Prod>[] = [
    { clave: "nombre", titulo: "Producto", valor: (p) => p.nombre, celda: (p) => <span className="font-semibold">{p.nombre}</span> },
    { clave: "categoria", titulo: "Categoría", valor: (p) => p.categoria },
    { clave: "ingresos", titulo: "Vendido", alinear: "der", valor: (p) => p.ingresos, celda: (p) => bs(p.ingresos, 0) },
    { clave: "costo", titulo: "Costó", alinear: "der", valor: (p) => p.costo, celda: (p) => bs(p.costo, 0) },
    { clave: "perdida", titulo: "Vencido", alinear: "der", valor: (p) => p.perdida, celda: (p) => (p.perdida ? <span className="text-red-600">{bs(p.perdida, 0)}</span> : "—") },
    { clave: "utilidad", titulo: "Utilidad", alinear: "der", valor: (p) => p.utilidad, celda: (p) => <b className={p.utilidad < 0 ? "text-red-600" : ""}>{bs(p.utilidad, 0)}</b> },
    { clave: "margen", titulo: "Margen", alinear: "der", valor: (p) => p.margen, celda: (p) => (p.ingresos ? pct(p.margen, 1) : "—") },
    {
      clave: "estado",
      titulo: "Estado",
      valor: (p) => ESTADO[p.estado].label,
      celda: (p) => (
        <Chip color={ESTADO[p.estado].chip} size="sm" variant="flat">
          {ESTADO[p.estado].label}
        </Chip>
      ),
    },
    {
      clave: "unidad",
      titulo: "Gana por unidad",
      alinear: "der",
      valor: (p) => (p.unidades ? p.precio - p.costoUnidad : 0),
      celda: (p) => (p.unidades ? <span className={p.precio - p.costoUnidad < 0 ? "text-red-600" : ""}>{bs(p.precio - p.costoUnidad)}</span> : "—"),
    },
  ];

  return (
    <PaginaReporte
      cargando={loading}
      crumb="Rentabilidad"
      error={ventasQ.error ?? finQ.error}
      listo={!!data && !!fin}
      onRango={setRange}
      pregunta="¿Qué productos dejan plata, cuáles casi no dejan y cuáles hacen perder?"
      rango={range}
      roles={[1, 4]}
      titulo="Rentabilidad por producto"
    >
      {data && fin && (
        <>
          <FilterBar dims={dims} value={filtros} onChange={setFiltros}>
            <span className="text-xs text-gray-500 hidden sm:inline">Ordenar por</span>
            <Segmented
              label="Ordenar por"
              options={[
                { value: "utilidad", label: "Utilidad (Bs)" },
                { value: "margen", label: "Margen (%)" },
              ]}
              value={vista}
              onChange={setVista}
            />
          </FilterBar>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <KpiAnimado
              definition="Lo que realmente te queda: lo vendido, menos lo que te costó esa mercadería y lo que se venció. Es antes de los gastos del local."
              delta={variacion(t.utilidad, utilidadPrev)}
              formato={(n) => bs(n, 0)}
              hint="lo que realmente te queda"
              icon="heroicons:banknotes"
              label="Utilidad"
              tone={t.utilidad < 0 ? "danger" : "primary"}
              valor={t.utilidad}
            />
            <KpiAnimado
              definition="De cada Bs 100 que vendes, cuántos bolivianos te quedan de utilidad."
              formato={(n) => pct(n, 1)}
              hint={`te quedan Bs ${t.margen.toFixed(1)} de cada Bs 100`}
              icon="heroicons:chart-pie"
              label="Margen"
              tone={t.margen < MARGEN_MINIMO ? "danger" : "success"}
              valor={t.margen}
            />
            <KpiAnimado
              definition="Total vendido de los productos elegidos."
              delta={variacion(t.ingresos, ingresosPrev)}
              formato={(n) => bs(n, 0)}
              hint="ingresos"
              icon="heroicons:shopping-cart"
              label="Vendido"
              tone="secondary"
              valor={t.ingresos}
            />
            <KpiAnimado
              definition="Costo de la mercadería que venció sin venderse dentro del período."
              formato={(n) => bs(n, 0)}
              hint="mercadería vencida"
              icon="heroicons:clock"
              label="Vencido"
              tone={t.perdida > 0 ? "danger" : "success"}
              valor={t.perdida}
            />
            <KpiAnimado
              definition="Productos que pierden plata o que dejan muy poco por cada venta."
              formato={(n) => String(Math.round(n))}
              hint={`de ${productos.length} productos`}
              icon="heroicons:exclamation-triangle"
              label="A revisar"
              tone={aRevisar.length ? "danger" : "success"}
              valor={aRevisar.length}
            />
          </div>

          <ChartPanel
            empty={!de100}
            height={150}
            option={opcion100}
            question="De cada 100 bolivianos que vendes: cuánto es costo, cuánto se perdió por vencimiento y cuánto te queda."
            stale={loading}
            title="¿A dónde va tu plata?"
          />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <ChartPanel
              empty={productos.length === 0}
              height={Math.max(300, ordenados.length * 36 + 40)}
              option={opcionTop}
              question="¿Qué productos dejan más (o menos)? Verde: bien · amarillo: revisar precio · rojo: pierde. Clic para filtrar."
              stale={loading}
              table={{
                head: ["Producto", "Utilidad", "Margen", "Estado"],
                rows: ordenados.map((p) => [p.nombre, bs(p.utilidad, 0), p.ingresos ? pct(p.margen, 1) : "—", ESTADO[p.estado].label]),
              }}
              title={vista === "utilidad" ? "Cuánto deja cada producto" : "Margen de cada producto"}
              tools={
                <Segmented
                  label="Cantidad a mostrar"
                  options={[
                    { value: 10, label: "Top 10" },
                    { value: 20, label: "Top 20" },
                  ]}
                  value={topN}
                  onChange={setTopN}
                />
              }
              onClick={(p) => alternar("producto", String(p.name))}
            />
            <ChartPanel
              empty={conVentas.length === 0}
              height={Math.max(300, ordenados.length * 36 + 40)}
              option={opcionDispersion}
              question="¿Qué conviene vender? Arriba a la derecha: vendes mucho y dejas mucho. Abajo: casi no dejas. El tamaño es la utilidad."
              stale={loading}
              title="Cuánto vendes vs cuánto dejas"
              onClick={(p) => p.data?.prod && alternar("producto", (p.data.prod as Prod).nombre)}
            />
          </div>

          <ChartPanel
            empty={porCategoria.length === 0}
            height={Math.max(220, porCategoria.length * 46 + 40)}
            option={opcionCat}
            question="¿Qué categoría deja más utilidad? Clic en una barra para filtrar."
            stale={loading}
            table={{ head: ["Categoría", "Utilidad"], rows: porCategoria.map((c) => [c.nombre, bs(c.utilidad, 0)]) }}
            title="Utilidad por categoría"
            onClick={(p) => alternar("categoria", String(p.name))}
          />

          <TablaBuscable
            clave={(p) => p.nombre}
            claseFila={(p) => (p.estado === "pierde" ? "bg-red-50/40" : p.estado === "revisar" ? "bg-amber-50/40" : "")}
            columnas={columnas}
            filas={productos}
            orden={{ clave: "utilidad", desc: false }}
            porPagina={10}
            subtitulo="«Pierde plata»: lo que se vendió no cubre el costo ni lo que se venció. «Revisar precio»: vende, pero deja muy poco por unidad. «Bien»: deja una ganancia razonable. «Gana por unidad» es el precio promedio de venta menos el costo."
            titulo="Detalle por producto"
            buscar={(p) => `${p.nombre} ${p.categoria} ${ESTADO[p.estado].label}`}
          />
          {data.avisos.sinCosto.length > 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              Estos productos se vendieron pero no tienen ninguna compra registrada, así que su costo cuenta como 0 y su utilidad sale inflada: {data.avisos.sinCosto.join(", ")}.
            </p>
          )}
          <p className="text-xs text-gray-500 px-1">Cantidad total vendida: {num(productos.reduce((s, p) => s + p.unidades, 0), 0)} unidades base. La utilidad no descuenta alquiler, sueldos ni otros gastos del local.</p>
        </>
      )}
    </PaginaReporte>
  );
}
