import type { EChartsOption } from "echarts";

import { bs } from "@/src/utils/report-format";

/**
 * Colores de los reportes. Un color = un significado en TODO el sistema:
 *  azul = ventas / entradas · naranja = compras / salidas · verde agua = traslados.
 * (Paleta base validada para daltonismo; el gris es para lo secundario.)
 */
export const COLORS = {
  ventas: "#2a78d6",
  compras: "#eb6834",
  traslado: "#1baf7a",
  gris: "#a5adba",
  ink: "#1b2430",
  muted: "#5b6675",
  grid: "#e4e8ee",
  positivo: "#0ca30c",
  negativo: "#d03b3b",
} as const;

const TEXT = { color: COLORS.muted, fontFamily: "inherit", fontSize: 12 };

/** "2026-09-05" → "05/09" */
export function fechaCorta(iso: string): string {
  const [, m, d] = iso.split("-");

  return `${d}/${m}`;
}

/** Barras horizontales ordenadas de mayor (arriba) a menor */
export function hBarOption(
  rows: Array<{ name: string; value: number }>,
  opts: { color: string; format?: (n: number) => string },
): EChartsOption {
  const fmt = opts.format ?? bs;
  const ordenado = [...rows].reverse(); // el eje Y de ECharts crece hacia arriba

  return {
    grid: { left: 8, right: 80, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "item",
      confine: true,
      formatter: (p: any) => `${p.name}<br/><b>${fmt(p.value)}</b>`,
    },
    xAxis: { type: "value", show: false },
    yAxis: {
      type: "category",
      data: ordenado.map((r) => r.name),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { ...TEXT, color: COLORS.ink, width: 130, overflow: "truncate" },
    },
    series: [
      {
        type: "bar",
        data: ordenado.map((r) => r.value),
        barMaxWidth: 18,
        itemStyle: { color: opts.color, borderRadius: [0, 4, 4, 0] },
        label: {
          show: true,
          position: "right",
          formatter: (p: any) => fmt(p.value),
          color: COLORS.ink,
          fontWeight: 600,
          fontSize: 12,
        },
      },
    ],
  };
}

/** Ventas y compras ACUMULADAS del período: muestra si la plata que entra sigue el ritmo de la que sale */
export function acumuladoOption(dias: string[], ventas: number[], compras: number[]): EChartsOption {
  const acum = (v: number[]) => v.reduce<number[]>((a, x) => [...a, (a.length ? a[a.length - 1] : 0) + x], []);
  const va = acum(ventas);
  const ca = acum(compras);
  const punto = (valor: number, color: string) => ({
    value: valor,
    symbol: "circle",
    symbolSize: 9,
    itemStyle: { color, borderColor: "#fff", borderWidth: 2 },
  });
  const ultimo = dias.length - 1;

  return {
    grid: { left: 8, right: 24, top: 24, bottom: 8, containLabel: true },
    tooltip: { trigger: "axis", confine: true, valueFormatter: (v: any) => bs(Number(v)) },
    xAxis: {
      type: "category",
      data: dias.map(fechaCorta),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: COLORS.grid } },
      axisLabel: { ...TEXT, hideOverlap: true },
    },
    yAxis: {
      type: "value",
      axisLabel: { ...TEXT, formatter: (v: number) => v.toLocaleString("en-US") },
      splitLine: { lineStyle: { color: COLORS.grid } },
    },
    series: [
      {
        name: "Ventas acumuladas",
        type: "line",
        step: false,
        data: va.map((v, i) => (i === ultimo ? punto(v, COLORS.ventas) : v)),
        showSymbol: false,
        lineStyle: { width: 3, color: COLORS.ventas },
        itemStyle: { color: COLORS.ventas },
        endLabel: { show: true, formatter: (p: any) => `Vendiste ${bs(Number(p.value), 0)}`, color: COLORS.ventas, fontWeight: 700, fontSize: 12 },
      },
      {
        name: "Compras acumuladas",
        type: "line",
        data: ca.map((v, i) => (i === ultimo ? punto(v, COLORS.compras) : v)),
        showSymbol: false,
        lineStyle: { width: 3, color: COLORS.compras },
        itemStyle: { color: COLORS.compras },
        endLabel: { show: true, formatter: (p: any) => `Compraste ${bs(Number(p.value), 0)}`, color: COLORS.compras, fontWeight: 700, fontSize: 12 },
      },
    ],
  };
}

export type PuntoVolumenMargen = {
  name: string;
  x: number; // cuánto vende (Bs.)
  y: number; // margen %
  estado: "pierde" | "revisar" | "ok";
};

/** "Vende mucho / deja mucho": cada punto es un producto. La esquina de abajo a la derecha es la que preocupa. */
export function volumenMargenOption(puntos: PuntoVolumenMargen[], umbral: number): EChartsOption {
  const xs = puntos.map((p) => p.x).sort((a, b) => a - b);
  const mediana = xs.length ? xs[Math.floor(xs.length / 2)] : 0;
  const color = { ok: COLORS.ventas, revisar: COLORS.compras, pierde: COLORS.negativo } as const;
  const minY = Math.min(0, ...puntos.map((p) => p.y));

  return {
    grid: { left: 8, right: 24, top: 24, bottom: 36, containLabel: true },
    tooltip: {
      trigger: "item",
      confine: true,
      formatter: (p: any) => `<b>${p.data.name}</b><br/>Vendes ${bs(p.data.value[0])}<br/>Margen ${p.data.value[1].toFixed(1)}%`,
    },
    xAxis: {
      type: "value",
      name: "Cuánto vendes (Bs.) →",
      nameLocation: "middle",
      nameGap: 26,
      nameTextStyle: { ...TEXT, color: COLORS.ink },
      axisLabel: { ...TEXT, formatter: (v: number) => v.toLocaleString("en-US") },
      splitLine: { lineStyle: { color: COLORS.grid } },
    },
    yAxis: {
      type: "value",
      name: "Margen %",
      nameTextStyle: { ...TEXT, color: COLORS.ink, align: "left" },
      min: minY < 0 ? Math.floor(minY - 5) : 0,
      axisLabel: { ...TEXT, formatter: (v: number) => `${v}%` },
      splitLine: { lineStyle: { color: COLORS.grid } },
    },
    series: [
      {
        type: "scatter",
        symbolSize: 16,
        data: puntos.map((p) => ({
          name: p.name,
          value: [p.x, p.y],
          itemStyle: { color: color[p.estado], borderColor: "#fff", borderWidth: 2 },
        })),
        label: { show: true, position: "right", formatter: (p: any) => p.data.name, color: COLORS.ink, fontSize: 11 },
        labelLayout: { hideOverlap: true },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: COLORS.muted, type: "dashed", width: 1 },
          label: { color: COLORS.muted, fontSize: 11 },
          data: [
            { yAxis: umbral, label: { formatter: `Margen mínimo ${umbral}%`, position: "insideEndTop" } },
            { xAxis: mediana, label: { formatter: "Venta típica", position: "insideEndTop" } },
          ],
        },
        markArea: {
          silent: true,
          itemStyle: { color: COLORS.compras, opacity: 0.1 },
          data: [[{ xAxis: mediana, yAxis: -1000 }, { xAxis: "max", yAxis: umbral }]],
        },
      },
    ],
  };
}

export type BarraUtilidad = { name: string; value: number; detail?: string };

/** Barras que salen desde cero: azul si ganan, rojo si pierden */
export function barrasUtilidadOption(filas: BarraUtilidad[]): EChartsOption {
  const orden = [...filas].reverse();

  return {
    grid: { left: 8, right: 90, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "item",
      confine: true,
      formatter: (p: any) => `<b>${p.name}</b><br/>${p.data.detail ?? bs(p.value)}`,
    },
    xAxis: {
      type: "value",
      axisLabel: { ...TEXT, formatter: (v: number) => v.toLocaleString("en-US") },
      splitLine: { lineStyle: { color: COLORS.grid } },
    },
    yAxis: {
      type: "category",
      data: orden.map((f) => f.name),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: COLORS.muted } },
      axisLabel: { ...TEXT, color: COLORS.ink, width: 130, overflow: "truncate" },
    },
    series: [
      {
        type: "bar",
        barMaxWidth: 18,
        data: orden.map((f) => ({
          name: f.name,
          value: f.value,
          detail: f.detail,
          itemStyle: {
            color: f.value >= 0 ? COLORS.ventas : COLORS.negativo,
            borderRadius: f.value >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4],
          },
          label: { position: f.value >= 0 ? "right" : "left" },
        })),
        label: { show: true, formatter: (p: any) => bs(p.value, 0), color: COLORS.ink, fontWeight: 600, fontSize: 12 },
      },
    ],
  };
}

export type PartesPrecio = { name: string; costo: number; ganancia: number; perdida: number; etiqueta: string };

/** El precio de cada unidad partido en costo (gris) y ganancia (azul) — o pérdida (rojo) */
export function partesPrecioOption(filas: PartesPrecio[]): EChartsOption {
  const orden = [...filas].reverse();

  return {
    grid: { left: 8, right: 150, top: 8, bottom: 8, containLabel: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, confine: true, valueFormatter: (v: any) => bs(Number(v)) },
    xAxis: { type: "value", show: false },
    yAxis: {
      type: "category",
      data: orden.map((f) => f.name),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { ...TEXT, color: COLORS.ink, width: 130, overflow: "truncate" },
    },
    series: [
      { name: "Lo que te cuesta", type: "bar", stack: "p", barMaxWidth: 18, itemStyle: { color: COLORS.gris }, data: orden.map((f) => f.costo) },
      { name: "Lo que ganas", type: "bar", stack: "p", barMaxWidth: 18, itemStyle: { color: COLORS.ventas }, data: orden.map((f) => f.ganancia) },
      { name: "Lo que pierdes", type: "bar", stack: "p", barMaxWidth: 18, itemStyle: { color: COLORS.negativo }, data: orden.map((f) => f.perdida) },
      {
        name: "etiqueta",
        type: "bar",
        stack: "p",
        silent: true,
        data: orden.map(() => 0),
        label: {
          show: true,
          position: "right",
          formatter: (p: any) => orden[p.dataIndex].etiqueta,
          color: COLORS.ink,
          fontWeight: 600,
          fontSize: 12,
        },
        tooltip: { show: false },
      },
    ],
  };
}

/** Columnas simples por categoría (p. ej. semanas). Las de valor 0 quedan vacías. */
export function columnasOption(
  filas: Array<{ name: string; value: number; detail?: string }>,
  opts: { color: string; format?: (n: number) => string },
): EChartsOption {
  const fmt = opts.format ?? bs;

  return {
    grid: { left: 8, right: 8, top: 28, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "item",
      confine: true,
      formatter: (p: any) => `${p.name}<br/><b>${fmt(p.value)}</b>${filas[p.dataIndex]?.detail ? "<br/>" + filas[p.dataIndex].detail : ""}`,
    },
    xAxis: {
      type: "category",
      data: filas.map((f) => f.name),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: COLORS.grid } },
      axisLabel: { ...TEXT, interval: 0 },
    },
    yAxis: { type: "value", show: false },
    series: [
      {
        type: "bar",
        data: filas.map((f) => f.value),
        barMaxWidth: 34,
        itemStyle: { color: opts.color, borderRadius: [4, 4, 0, 0] },
        label: {
          show: true,
          position: "top",
          formatter: (p: any) => (p.value > 0 ? fmt(p.value) : ""),
          color: COLORS.ink,
          fontWeight: 600,
          fontSize: 12,
        },
      },
    ],
  };
}

/** Columnas agrupadas por día: dos series lado a lado (p. ej. entradas y traslados) */
export function columnasDiariasOption(
  dias: string[],
  series: Array<{ name: string; color: string; data: number[] }>,
): EChartsOption {
  return {
    grid: { left: 8, right: 8, top: 16, bottom: 8, containLabel: true },
    tooltip: { trigger: "axis", confine: true, valueFormatter: (v: any) => bs(Number(v)) },
    xAxis: {
      type: "category",
      data: dias.map(fechaCorta),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: COLORS.grid } },
      axisLabel: { ...TEXT, hideOverlap: true },
    },
    yAxis: {
      type: "value",
      axisLabel: { ...TEXT, formatter: (v: number) => v.toLocaleString("en-US") },
      splitLine: { lineStyle: { color: COLORS.grid } },
    },
    series: series.map((s) => ({
      name: s.name,
      type: "bar" as const,
      data: s.data,
      barMaxWidth: 16,
      itemStyle: { color: s.color, borderRadius: [3, 3, 0, 0] },
    })),
  };
}

/** Ventas por día del período frente al período anterior (línea punteada gris) */
export function ventasVsAnteriorOption(dias: string[], actual: number[], anterior: number[], anteriorRotulo: string): EChartsOption {
  return {
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    tooltip: { trigger: "axis", confine: true, valueFormatter: (v: any) => bs(Number(v)) },
    xAxis: {
      type: "category",
      data: dias.map(fechaCorta),
      boundaryGap: false,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: COLORS.grid } },
      axisLabel: { ...TEXT, hideOverlap: true },
    },
    yAxis: {
      type: "value",
      axisLabel: { ...TEXT, formatter: (v: number) => v.toLocaleString("en-US") },
      splitLine: { lineStyle: { color: COLORS.grid } },
    },
    series: [
      {
        name: anteriorRotulo,
        type: "line",
        data: anterior,
        showSymbol: false,
        lineStyle: { width: 2, color: COLORS.gris, type: "dashed" },
        itemStyle: { color: COLORS.gris },
      },
      {
        name: "Este período",
        type: "line",
        data: actual,
        showSymbol: false,
        lineStyle: { width: 3, color: COLORS.ventas },
        itemStyle: { color: COLORS.ventas },
        areaStyle: { color: COLORS.ventas, opacity: 0.08 },
      },
    ],
  };
}

/** Colores fijos, en orden, para series que representan personas (no se reciclan por posición en el ranking) */
export const COLORES_PERSONAS = [COLORS.ventas, COLORS.compras, COLORS.traslado, "#8a5cd6", COLORS.gris];

/** Una línea por persona: ventas de cada día */
export function lineasPorPersonaOption(
  dias: string[],
  series: Array<{ name: string; color: string; data: number[] }>,
): EChartsOption {
  return {
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    tooltip: { trigger: "axis", confine: true, valueFormatter: (v: any) => bs(Number(v)) },
    xAxis: {
      type: "category",
      data: dias.map(fechaCorta),
      boundaryGap: false,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: COLORS.grid } },
      axisLabel: { ...TEXT, hideOverlap: true },
    },
    yAxis: {
      type: "value",
      axisLabel: { ...TEXT, formatter: (v: number) => v.toLocaleString("en-US") },
      splitLine: { lineStyle: { color: COLORS.grid } },
    },
    series: series.map((s) => ({
      name: s.name,
      type: "line" as const,
      data: s.data,
      showSymbol: false,
      lineStyle: { width: 2.5, color: s.color },
      itemStyle: { color: s.color },
    })),
  };
}

/** "De cada Bs. 100 que vendes, cuánto te queda": una barra por producto, color de semáforo */
export function gananciaPor100Option(
  filas: Array<{ name: string; value: number; estado: "pierde" | "revisar" | "ok" }>,
  umbral: number,
): EChartsOption {
  const orden = [...filas].reverse();
  const color = { ok: COLORS.ventas, revisar: COLORS.compras, pierde: COLORS.negativo } as const;

  return {
    grid: { left: 8, right: 100, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "item",
      confine: true,
      formatter: (p: any) =>
        `<b>${p.name}</b><br/>${p.value >= 0 ? `De cada Bs. 100 vendidos te quedan Bs. ${p.value.toFixed(0)}` : `De cada Bs. 100 vendidos pierdes Bs. ${Math.abs(p.value).toFixed(0)}`}`,
    },
    xAxis: { type: "value", show: false, min: Math.min(0, ...filas.map((f) => f.value)) },
    yAxis: {
      type: "category",
      data: orden.map((f) => f.name),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: COLORS.muted } },
      axisLabel: { ...TEXT, color: COLORS.ink, width: 130, overflow: "truncate" },
    },
    series: [
      {
        type: "bar",
        barMaxWidth: 18,
        data: orden.map((f) => ({
          name: f.name,
          value: f.value,
          itemStyle: { color: color[f.estado], borderRadius: f.value >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4] },
        })),
        label: {
          show: true,
          position: "right",
          formatter: (p: any) => `Bs. ${Math.round(p.value)}`,
          color: COLORS.ink,
          fontWeight: 600,
          fontSize: 12,
        },
        markLine: {
          symbol: "none",
          silent: true,
          lineStyle: { color: COLORS.muted, type: "dashed" },
          label: { formatter: `Mínimo Bs. ${umbral}`, color: COLORS.muted, fontSize: 11 },
          data: [{ xAxis: umbral }],
        },
      },
    ],
  };
}
