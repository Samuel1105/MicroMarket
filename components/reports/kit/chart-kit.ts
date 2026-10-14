/** Piezas comunes de los gráficos interactivos: colores, tooltips y estilos de ejes */

export const FONT = "ui-sans-serif, system-ui, sans-serif";
export const INK = "#0f172a";
export const MUTED = "#64748b";
export const GRID = "#eceff5";

/** Colores por significado (paleta validada: no se reordenan ni cambian con los filtros) */
export const TIPO_COLOR = {
  entrada: "#2a78d6", // azul
  traslado: "#1baf7a", // verde agua
  venta: "#eb6834", // naranja
  ajuste: "#6250d6", // violeta
} as const;

const esc = (s: unknown) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const tooltipBase = {
  backgroundColor: "#ffffff",
  borderWidth: 0,
  padding: 0,
  extraCssText: "box-shadow:0 10px 30px rgba(15,23,42,.18);border-radius:12px;",
  textStyle: { fontFamily: FONT, color: INK },
  confine: true,
};

/** Tarjeta de tooltip: el valor manda, el nombre acompaña */
export function tipHtml(title: string, rows: { color: string; name: string; value: string }[], footer?: string) {
  return `<div style="padding:12px 14px;min-width:190px;font-family:${FONT}">
    <div style="font-weight:600;font-size:13px;margin-bottom:8px;color:${INK};max-width:280px;white-space:normal">${esc(title)}</div>
    ${rows
      .map(
        (r) => `<div style="display:flex;align-items:center;gap:8px;margin:3px 0;font-size:12px;color:${MUTED}">
        <span style="width:12px;height:3px;border-radius:2px;background:${r.color}"></span><span style="flex:1">${esc(r.name)}</span>
        <b style="color:${INK};font-variant-numeric:tabular-nums">${esc(r.value)}</b></div>`,
      )
      .join("")}
    ${footer ? `<div style="border-top:1px solid ${GRID};margin-top:6px;padding-top:6px;font-size:12px;color:${MUTED}">${esc(footer)}</div>` : ""}
  </div>`;
}

export const base = {
  animationDuration: 600,
  animationEasing: "cubicOut",
  textStyle: { fontFamily: FONT },
};

export const valueAxis = {
  type: "value" as const,
  axisLabel: { color: "#94a3b8", fontSize: 11 },
  splitLine: { lineStyle: { color: GRID } },
  axisLine: { show: false },
};

export const legendTop = {
  top: 0,
  type: "plain" as const,
  icon: "roundRect",
  itemWidth: 10,
  itemHeight: 10,
  itemGap: 14,
  textStyle: { color: MUTED, fontSize: 12 },
};
