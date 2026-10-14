import { base, FONT, INK, legendTop, MUTED, tipHtml, tooltipBase, valueAxis } from "./chart-kit";

/** Constructores de opciones de ECharts: todos animados, con tooltip en tarjeta y "atenuado" de lo no seleccionado */

export type Serie = { name: string; color: string; data: number[] };

type Fmt = (n: number) => string;

const REDONDEO = 3;

/**
 * Columnas (o líneas) a lo largo del tiempo o por categorías.
 * `apilado`: las series se apilan. `linea`: se dibuja como línea con área suave.
 * `superpuesta`: una línea gris encima (p. ej. "período anterior").
 */
export function opcionColumnas(o: {
  etiquetas: string[];
  series: Serie[];
  fmt: Fmt;
  apilado?: boolean;
  linea?: boolean;
  superpuesta?: Serie;
  leyenda?: boolean;
  ejeFmt?: (n: number) => string;
}) {
  const multiples = o.series.length > 1 || !!o.superpuesta;

  return {
    ...base,
    grid: { left: 4, right: 12, top: multiples && o.leyenda !== false ? 44 : 20, bottom: 4, containLabel: true },
    legend: multiples && o.leyenda !== false ? legendTop : { show: false },
    tooltip: {
      ...tooltipBase,
      trigger: "axis",
      axisPointer: o.linea ? { type: "line", lineStyle: { color: "#cbd5e1" } } : { type: "shadow", shadowStyle: { color: "rgba(11,58,85,.06)" } },
      formatter: (ps: any[]) => {
        const items = ps
          .filter((p) => p.value !== null && p.value !== undefined && Number(p.value) !== 0)
          .map((p) => ({ color: p.color?.colorStops ? p.color.colorStops[0].color : p.color, name: p.seriesName, value: o.fmt(Number(p.value)), n: Number(p.value) }))
          .sort((a, b) => b.n - a.n);
        const total = ps.filter((p) => p.seriesName !== o.superpuesta?.name).reduce((s, p) => s + Number(p.value || 0), 0);

        return tipHtml(
          ps[0].axisValue,
          items.map(({ color, name, value }) => ({ color, name, value })),
          o.apilado && items.length > 1 ? `Total: ${o.fmt(total)}` : undefined,
        );
      },
    },
    xAxis: {
      type: "category",
      data: o.etiquetas,
      boundaryGap: !o.linea,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#e2e8f0" } },
      axisLabel: { color: MUTED, fontSize: 12, hideOverlap: true },
    },
    yAxis: { ...valueAxis, axisLabel: { ...valueAxis.axisLabel, formatter: o.ejeFmt ?? ((v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))) } },
    series: [
      ...o.series.map((s) =>
        o.linea
          ? {
              name: s.name,
              type: "line",
              smooth: 0.25,
              showSymbol: o.etiquetas.length <= 40,
              symbol: "circle",
              symbolSize: 7,
              lineStyle: { width: 3, color: s.color },
              itemStyle: { color: s.color, borderColor: "#fff", borderWidth: 2 },
              emphasis: { focus: "series", lineStyle: { width: 4 } },
              areaStyle:
                o.series.length === 1 && !o.superpuesta
                  ? { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: s.color + "40" }, { offset: 1, color: s.color + "00" }] } }
                  : undefined,
              stack: o.apilado ? "t" : undefined,
              data: s.data,
            }
          : {
              name: s.name,
              type: "bar",
              stack: o.apilado ? "t" : undefined,
              barMaxWidth: o.apilado ? 34 : 30,
              barGap: "12%",
              emphasis: { focus: "series" },
              itemStyle: o.apilado
                ? { color: s.color, borderColor: "#fff", borderWidth: 1.5, borderRadius: REDONDEO }
                : { color: s.color, borderRadius: [8, 8, 0, 0] },
              data: s.data,
            },
      ),
      ...(o.superpuesta
        ? [
            {
              name: o.superpuesta.name,
              type: "line",
              smooth: 0.25,
              symbol: "none",
              z: 5,
              lineStyle: { width: 2, color: o.superpuesta.color, type: "dashed" },
              itemStyle: { color: o.superpuesta.color },
              data: o.superpuesta.data,
            },
          ]
        : []),
    ],
  };
}

/**
 * Barras horizontales (ranking). Una barra por nombre; con varias series se apilan.
 * `seleccion` atenúa las barras no seleccionadas. `colorPorBarra` pinta cada barra de su color (serie única).
 */
export function opcionBarrasH(o: {
  nombres: string[];
  series: Array<{ name: string; color: string; valores: number[] }>;
  fmt: Fmt;
  seleccion?: string[];
  colorPorBarra?: string[];
  /** Texto del final de la barra (por defecto, el total formateado) */
  etiqueta?: (nombre: string, total: number) => string;
  /** Línea extra del tooltip para cada barra */
  pie?: (nombre: string) => string | undefined;
  /** Los valores negativos se pintan de rojo */
  negativoRojo?: boolean;
  /** Largo máximo del eje (por ejemplo 100 cuando son porcentajes) */
  maximo?: number;
}) {
  const apilado = o.series.length > 1;
  const totales = o.nombres.map((_, i) => o.series.reduce((s, x) => s + (x.valores[i] ?? 0), 0));
  const sel = o.seleccion ?? [];

  return {
    ...base,
    grid: { left: 4, right: 70, top: apilado ? 40 : 12, bottom: 4, containLabel: true },
    legend: apilado ? legendTop : { show: false },
    tooltip: {
      ...tooltipBase,
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { color: "rgba(11,58,85,.06)" } },
      formatter: (ps: any[]) => {
        const items = ps
          .filter((p) => Number(p.value) !== 0 && p.value !== undefined)
          .map((p) => ({ color: p.color?.colorStops ? p.color.colorStops[0].color : p.color, name: p.seriesName, value: o.fmt(Number(p.value)) }));
        const total = ps.reduce((s, p) => s + Number(p.value || 0), 0);
        const pie = o.pie?.(ps[0].axisValue);

        return tipHtml(
          ps[0].axisValue,
          items,
          [apilado && items.length > 1 ? `Total: ${o.fmt(total)}` : "", pie ?? ""].filter(Boolean).join(" · ") || undefined,
        );
      },
    },
    xAxis: { ...valueAxis, max: o.maximo, axisLabel: { ...valueAxis.axisLabel, formatter: (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v)) } },
    yAxis: {
      type: "category",
      inverse: true,
      data: o.nombres,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#e2e8f0" } },
      axisLabel: { color: "#334155", fontSize: 12, width: 150, overflow: "truncate" },
    },
    series: o.series.map((s, si) => ({
      name: s.name,
      type: "bar",
      color: s.color,
      stack: apilado ? "r" : undefined,
      barMaxWidth: 26,
      emphasis: { focus: "series" },
      label:
        si === o.series.length - 1
          ? {
              show: true,
              position: apilado ? "right" : "right",
              color: INK,
              fontSize: 11,
              fontWeight: 600,
              formatter: (p: any) => (o.etiqueta ? o.etiqueta(o.nombres[p.dataIndex], totales[p.dataIndex]) : o.fmt(totales[p.dataIndex])),
            }
          : { show: false },
      data: s.valores.map((v, i) => ({
        value: v,
        itemStyle: {
          color: o.negativoRojo && v < 0 ? "#d03b3b" : (o.colorPorBarra?.[i] ?? s.color),
          borderColor: apilado ? "#fff" : undefined,
          borderWidth: apilado ? 1.5 : 0,
          borderRadius: apilado ? REDONDEO : [0, 8, 8, 0],
          opacity: sel.length && !sel.includes(o.nombres[i]) ? 0.3 : 1,
        },
      })),
    })),
  };
}

/** Dona con el total al centro; `seleccion` atenúa lo no elegido */
export function opcionDona(o: {
  datos: Array<{ name: string; value: number; color: string }>;
  centro: { texto: string; sub: string };
  fmt: Fmt;
  seleccion?: string[];
}) {
  const sel = o.seleccion ?? [];

  return {
    ...base,
    tooltip: {
      ...tooltipBase,
      trigger: "item",
      formatter: (p: any) => tipHtml(p.name, [{ color: p.color, name: "Total", value: o.fmt(p.value) }], `${Math.round(p.percent)}% del total`),
    },
    legend: { ...legendTop, top: undefined, bottom: 0 },
    title: {
      text: o.centro.texto,
      subtext: o.centro.sub,
      left: "center",
      top: "36%",
      textStyle: { fontFamily: FONT, fontSize: 24, fontWeight: 700, color: INK },
      subtextStyle: { fontFamily: FONT, fontSize: 12, color: MUTED },
    },
    series: [
      {
        type: "pie",
        radius: ["56%", "80%"],
        center: ["50%", "44%"],
        label: { show: false },
        itemStyle: { borderColor: "#fff", borderWidth: 3, borderRadius: 6 },
        emphasis: { scaleSize: 6 },
        data: o.datos
          .filter((x) => x.value > 0)
          .map((x) => ({
            name: x.name,
            value: x.value,
            itemStyle: { color: x.color, opacity: sel.length && !sel.includes(x.name) ? 0.3 : 1 },
          })),
      },
    ],
  };
}

/** Mapa de calor (p. ej. día de la semana × hora). `datos` = [indiceX, indiceY, valor] */
export function opcionCalor(o: {
  x: string[];
  y: string[];
  datos: number[][];
  max: number;
  titulo: (xi: number, yi: number) => string;
  fmt: Fmt;
  paleta?: string[];
}) {
  return {
    ...base,
    grid: { left: 4, right: 12, top: 8, bottom: 52, containLabel: true },
    tooltip: {
      ...tooltipBase,
      trigger: "item",
      formatter: (p: any) => tipHtml(o.titulo(p.value[0], p.value[1]), [{ color: "#2a78d6", name: "Cantidad", value: o.fmt(p.value[2]) }]),
    },
    xAxis: {
      type: "category",
      data: o.x,
      splitArea: { show: false },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#e2e8f0" } },
      axisLabel: { color: MUTED, fontSize: 11 },
    },
    yAxis: { type: "category", data: o.y, inverse: true, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: "#334155", fontSize: 12 } },
    visualMap: {
      min: 0,
      max: Math.max(o.max, 1),
      calculable: false,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      itemWidth: 12,
      itemHeight: 140,
      text: ["Más", "Menos"],
      textStyle: { color: MUTED, fontSize: 11 },
      inRange: { color: o.paleta ?? ["#eef4fb", "#9ec5f4", "#3987e5", "#184f95"] },
    },
    series: [
      {
        type: "heatmap",
        data: o.datos,
        itemStyle: { borderColor: "#fff", borderWidth: 2, borderRadius: 4 },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: "rgba(11,58,85,.35)" } },
      },
    ],
  };
}

/** Datos de tabla para un conjunto de series (primera columna = etiqueta) */
export function tablaDeSeries(titulo: string, etiquetas: string[], series: Serie[], fmt: (n: number) => string, conTotal = true) {
  return {
    head: [titulo, ...series.map((s) => s.name), ...(conTotal && series.length > 1 ? ["Total"] : [])],
    rows: etiquetas.map((e, i) => [
      e,
      ...series.map((s) => fmt(s.data[i] ?? 0)),
      ...(conTotal && series.length > 1 ? [fmt(series.reduce((t, s) => t + (s.data[i] ?? 0), 0))] : []),
    ]),
  };
}
