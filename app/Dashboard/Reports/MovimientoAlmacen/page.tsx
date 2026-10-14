"use client";

import { Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import React, { useMemo, useState } from "react";

import { getWarehouseMovements, LineaMov, TipoLinea } from "@/actions/reportes/reporte-movimiento-almacen";
import ChartPanel from "@/components/reports/kit/ChartPanel";
import FilterBar, { FilterDim, Filters } from "@/components/reports/kit/FilterBar";
import KpiAnimado from "@/components/reports/kit/KpiAnimado";
import PaginaReporte from "@/components/reports/kit/PaginaReporte";
import Segmented from "@/components/reports/kit/Segmented";
import TablaBuscable, { Columna } from "@/components/reports/kit/TablaBuscable";
import { TIPO_COLOR } from "@/components/reports/kit/chart-kit";
import { crearCubos, DIAS_SEMANA, diaSemanaDe, fechaEs, fechaHora, horaDe } from "@/components/reports/kit/fechas";
import { opcionBarrasH, opcionCalor, opcionColumnas, opcionDona, tablaDeSeries } from "@/components/reports/kit/opciones";
import { useReporte } from "@/components/reports/kit/useReporte";
import Kpi from "@/components/reports/Kpi";
import { ReportRange } from "@/components/reports/ReportHeader";
import { getCurrentMonthRange } from "@/src/utils/report-dates";
import { num } from "@/src/utils/report-format";

const TIPOS: TipoLinea[] = ["entrada", "traslado", "venta", "ajuste"];
const INFO: Record<TipoLinea, { label: string; plural: string; color: "primary" | "success" | "warning" | "danger"; icon: string }> = {
  entrada: { label: "Entrada", plural: "Entradas a bodega", color: "primary", icon: "heroicons:arrow-down-tray" },
  traslado: { label: "Al estante", plural: "Pasaron al estante", color: "success", icon: "heroicons:arrows-right-left" },
  venta: { label: "Venta", plural: "Salieron por ventas", color: "warning", icon: "heroicons:shopping-cart" },
  ajuste: { label: "Ajuste", plural: "Ajustes de stock", color: "danger", icon: "heroicons:adjustments-horizontal" },
};
const cant = (n: number) => num(n, n % 1 ? 1 : 0);

function cantidadTexto(l: LineaMov) {
  const n = cant(Math.abs(l.cantidad));

  if (l.tipo === "ajuste") return `${l.cantidad > 0 ? "+" : "−"}${n} ${l.unidad}`;
  if (l.tipo === "venta") return `−${n} ${l.unidad}`;
  if (l.tipo === "entrada") return `+${n} ${l.unidad}`;

  return `${n} ${l.unidad}`;
}

export default function WarehouseMovementsReport() {
  const [range, setRange] = useState<ReportRange>(getCurrentMonthRange());
  const { data, loading, error } = useReporte(getWarehouseMovements, range);
  const [filtros, setFiltros] = useState<Filters>({});
  const [medida, setMedida] = useState<"mov" | "uni">("mov");
  const [topN, setTopN] = useState<10 | 20>(10);

  const peso = (l: LineaMov) => (medida === "mov" ? 1 : Math.abs(l.cantidad));
  const fmt = (n: number) => `${cant(n)} ${medida === "mov" ? (n === 1 ? "movimiento" : "movimientos") : "unidades"}`;
  const nombreUnidad = medida === "mov" ? "movimientos" : "unidades";

  const dims = useMemo<FilterDim[]>(() => {
    const lineas = data?.lineas ?? [];
    const personas = new Map<string, string>();

    lineas.forEach((l) => personas.set(String(l.usuarioId), l.usuario));

    return [
      { key: "tipo", label: "Tipo", icon: "heroicons:squares-2x2", options: TIPOS, show: (v) => INFO[v as TipoLinea].plural },
      {
        key: "quien",
        label: "Quién",
        icon: "heroicons:user",
        options: Array.from(personas.keys()).sort((a, b) => (personas.get(a) ?? "").localeCompare(personas.get(b) ?? "")),
        show: (v) => personas.get(v) ?? v,
      },
      { key: "producto", label: "Producto", icon: "heroicons:cube", options: Array.from(new Set(lineas.map((l) => l.producto))).sort((a, b) => a.localeCompare(b)) },
      { key: "categoria", label: "Categoría", icon: "heroicons:tag", options: Array.from(new Set(lineas.map((l) => l.categoria))).sort((a, b) => a.localeCompare(b)) },
    ];
  }, [data]);

  const idPorNombre = useMemo(() => new Map((data?.lineas ?? []).map((l) => [l.usuario, l.usuarioId])), [data]);

  const filtradas = useMemo(
    () =>
      (data?.lineas ?? []).filter(
        (l) =>
          (!filtros.tipo?.length || filtros.tipo.includes(l.tipo)) &&
          (!filtros.quien?.length || filtros.quien.includes(String(l.usuarioId))) &&
          (!filtros.producto?.length || filtros.producto.includes(l.producto)) &&
          (!filtros.categoria?.length || filtros.categoria.includes(l.categoria)),
      ),
    [data, filtros],
  );
  /** Lo anulado queda en el registro pero no cuenta en cifras ni gráficos */
  const activas = useMemo(() => filtradas.filter((l) => !l.anulado), [filtradas]);

  const alternar = (clave: string, valor: string) =>
    setFiltros((f) => {
      const actual = f[clave] ?? [];
      const n = { ...f };
      const lista = actual.includes(valor) ? actual.filter((x) => x !== valor) : [...actual, valor];

      if (lista.length) n[clave] = lista;
      else delete n[clave];

      return n;
    });

  // ── Cifras ──
  const resumen = useMemo(() => {
    const porTipo = Object.fromEntries(TIPOS.map((t) => [t, { n: 0, unidades: 0, ventas: new Set<string>() }])) as Record<TipoLinea, { n: number; unidades: number; ventas: Set<string> }>;
    const personas = new Set<number>();
    const productos = new Set<string>();

    for (const l of activas) {
      const r = porTipo[l.tipo];

      r.n += 1;
      r.unidades += Math.abs(l.cantidad);
      r.ventas.add(l.referencia ?? l.id);
      personas.add(l.usuarioId);
      productos.add(l.producto);
    }

    return { porTipo, personas: personas.size, productos: productos.size };
  }, [activas]);

  // ── Por día / semana ──
  const cubos = useMemo(() => (data ? crearCubos(data.rango.start, data.rango.end) : null), [data]);
  const seriesDias = useMemo(() => {
    if (!cubos) return [];

    return TIPOS.map((t) => {
      const d = cubos.claves.map(() => 0);

      for (const l of activas) if (l.tipo === t) d[cubos.indice(l.fecha.slice(0, 10))] += peso(l);

      return { name: INFO[t].plural, color: TIPO_COLOR[t], data: d };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cubos, activas, medida]);

  const opcionDias = useMemo(
    () => (cubos ? opcionColumnas({ etiquetas: cubos.etiquetas, series: seriesDias, apilado: true, fmt }) : {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cubos, seriesDias, medida],
  );

  // ── Dona por tipo ──
  const totalesTipo = useMemo(
    () => TIPOS.map((t) => ({ t, valor: activas.filter((l) => l.tipo === t).reduce((s, l) => s + peso(l), 0) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activas, medida],
  );
  const totalGeneral = totalesTipo.reduce((s, x) => s + x.valor, 0);
  const opcionTipo = useMemo(
    () =>
      opcionDona({
        datos: totalesTipo.map((x) => ({ name: INFO[x.t].plural, value: x.valor, color: TIPO_COLOR[x.t] })),
        centro: { texto: num(totalGeneral), sub: nombreUnidad },
        fmt,
        seleccion: (filtros.tipo ?? []).map((t) => INFO[t as TipoLinea].plural),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [totalesTipo, filtros.tipo, medida],
  );

  // ── Rankings (quién / producto) ──
  function ranking(clave: (l: LineaMov) => string, limite: number) {
    const m = new Map<string, Record<TipoLinea, number>>();

    for (const l of activas) {
      const r = m.get(clave(l)) ?? { entrada: 0, traslado: 0, venta: 0, ajuste: 0 };

      r[l.tipo] += peso(l);
      m.set(clave(l), r);
    }

    return Array.from(m.entries())
      .map(([nombre, r]) => ({ nombre, r, total: TIPOS.reduce((s, t) => s + r[t], 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limite);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rankQuien = useMemo(() => ranking((l) => l.usuario, 12), [activas, medida]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rankProducto = useMemo(() => ranking((l) => l.producto, topN), [activas, medida, topN]);
  const trasladosPorProducto = useMemo(() => {
    const m = new Map<string, number>();

    for (const l of activas) if (l.tipo === "traslado") m.set(l.producto, (m.get(l.producto) ?? 0) + 1);

    return m;
  }, [activas]);

  const seriesRank = (rank: ReturnType<typeof ranking>) =>
    TIPOS.map((t) => ({ name: INFO[t].plural, color: TIPO_COLOR[t], valores: rank.map((x) => x.r[t]) }));
  const tablaRank = (rank: ReturnType<typeof ranking>, titulo: string) => ({
    head: [titulo, ...TIPOS.map((t) => INFO[t].label), "Total"],
    rows: rank.map((x) => [x.nombre, ...TIPOS.map((t) => cant(x.r[t])), cant(x.total)]),
  });

  const opcionQuien = useMemo(
    () =>
      opcionBarrasH({
        nombres: rankQuien.map((x) => x.nombre),
        series: seriesRank(rankQuien),
        fmt,
        etiqueta: (_n, t) => cant(t),
        seleccion: (filtros.quien ?? []).map((id) => [...idPorNombre.entries()].find(([, v]) => String(v) === id)?.[0] ?? ""),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rankQuien, filtros.quien, idPorNombre, medida],
  );
  const opcionProducto = useMemo(
    () =>
      opcionBarrasH({
        nombres: rankProducto.map((x) => x.nombre),
        series: seriesRank(rankProducto),
        fmt,
        etiqueta: (_n, t) => cant(t),
        seleccion: filtros.producto ?? [],
        pie: (nombre) => {
          const n = trasladosPorProducto.get(nombre);

          return n && data ? `Se pasa al estante cada ${num(data.rango.dias / n, 1)} días (${n} ${n === 1 ? "vez" : "veces"})` : undefined;
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rankProducto, filtros.producto, trasladosPorProducto, medida, data],
  );

  // ── Mapa de calor: día de la semana × hora ──
  const calor = useMemo(() => {
    const celdas = new Map<string, number>();
    let hMin = 24;
    let hMax = 0;

    for (const l of activas) {
      const ts = new Date(l.fecha).getTime() / 1000;
      const dow = diaSemanaDe(ts);
      const h = horaDe(ts);

      celdas.set(`${dow}-${h}`, (celdas.get(`${dow}-${h}`) ?? 0) + peso(l));
      hMin = Math.min(hMin, h);
      hMax = Math.max(hMax, h);
    }

    if (hMin > hMax) return { horas: [] as number[], datos: [] as number[][], max: 0 };
    const horas: number[] = [];

    for (let h = hMin; h <= hMax; h++) horas.push(h);
    const datos: number[][] = [];

    for (let dow = 0; dow < 7; dow++) horas.forEach((h, i) => datos.push([i, dow, celdas.get(`${dow}-${h}`) ?? 0]));

    return { horas, datos, max: Math.max(...datos.map((x) => x[2]), 1) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activas, medida]);

  const opcionHora = useMemo(
    () =>
      opcionCalor({
        x: calor.horas.map((h) => `${String(h).padStart(2, "0")}h`),
        y: DIAS_SEMANA,
        datos: calor.datos,
        max: calor.max,
        fmt,
        titulo: (xi, yi) => `${DIAS_SEMANA[yi]} · ${String(calor.horas[xi]).padStart(2, "0")}:00 a ${String(calor.horas[xi]).padStart(2, "0")}:59`,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calor, medida],
  );

  // ── Registro ──
  const columnas: Columna<LineaMov>[] = [
    { clave: "fecha", titulo: "Fecha y hora", valor: (l) => l.fecha, celda: (l) => <span className={`whitespace-nowrap tabular-nums ${l.anulado ? "text-gray-400" : ""}`}>{fechaHora(l.fecha)}</span> },
    {
      clave: "tipo",
      titulo: "Tipo",
      valor: (l) => INFO[l.tipo].label,
      celda: (l) => (
        <Chip color={l.anulado ? "default" : INFO[l.tipo].color} size="sm" variant="flat">
          {l.anulado ? (l.tipo === "venta" ? "Venta anulada" : "Entrada anulada") : INFO[l.tipo].label}
        </Chip>
      ),
    },
    {
      clave: "producto",
      titulo: "Producto",
      valor: (l) => l.producto,
      celda: (l) => (
        <span className={l.anulado ? "line-through text-gray-400" : ""}>
          <span className="font-medium block">{l.producto}</span>
          {l.lote && <span className="text-xs text-gray-400">Lote {l.lote}</span>}
        </span>
      ),
    },
    {
      clave: "cantidad",
      titulo: "Cantidad",
      alinear: "der",
      valor: (l) => l.cantidad,
      celda: (l) => (
        <span className={`font-medium ${l.anulado ? "line-through text-gray-400" : l.tipo === "ajuste" ? (l.cantidad < 0 ? "text-red-600" : "text-green-600") : ""}`}>{cantidadTexto(l)}</span>
      ),
    },
    { clave: "quien", titulo: "Quién", valor: (l) => l.usuario, celda: (l) => <span className="font-medium whitespace-nowrap">{l.usuario}</span> },
    {
      clave: "ref",
      titulo: "Referencia y detalle",
      valor: (l) => `${l.referencia ?? ""} ${l.detalle ?? ""}`.trim(),
      celda: (l) => (
        <span className="text-gray-600">
          {l.referencia && <span className="font-medium text-gray-700 block">{l.referencia}</span>}
          {l.detalle && <span className="text-xs">{l.detalle}</span>}
        </span>
      ),
    },
  ];

  const sinMov = !data || data.lineas.length === 0;
  const hayFiltros = Object.values(filtros).some((v) => v.length);

  return (
    <PaginaReporte
      cargando={loading}
      crumb="Movimiento de almacén"
      error={error}
      listo={!!data}
      onRango={setRange}
      pregunta="¿Qué se movió, cuánto, quién lo hizo y cada cuánto?"
      rango={range}
      roles={[1, 3, 4]}
      titulo="Movimiento de almacén"
    >
      {data && cubos && (
        <>
          <FilterBar dims={dims} value={filtros} onChange={setFiltros}>
            <span className="text-xs text-gray-500 hidden sm:inline">Medir en</span>
            <Segmented
              label="Medir en"
              options={[
                { value: "mov", label: "Movimientos" },
                { value: "uni", label: "Unidades" },
              ]}
              value={medida}
              onChange={setMedida}
            />
          </FilterBar>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {TIPOS.map((t) => (
              <KpiAnimado
                key={t}
                definition={
                  t === "venta"
                    ? "Productos que salieron por ventas (cada producto vendido cuenta como un movimiento). No cuenta las ventas anuladas."
                    : t === "ajuste"
                      ? "Correcciones de stock hechas a mano (merma, daño, pérdida, error de conteo)."
                      : t === "entrada"
                        ? "Mercadería que llegó al almacén por una compra (cuando el almacén valida lo recibido)."
                        : "Producto que se sacó de la bodega y se puso en el estante para vender."
                }
                formato={(n) => num(Math.round(n))}
                hint={`${cant(resumen.porTipo[t].unidades)} unidades en total${t === "venta" ? ` · ${resumen.porTipo[t].ventas.size} ventas` : ""}`}
                icon={INFO[t].icon}
                label={INFO[t].plural}
                tone={t === "entrada" ? "primary" : t === "traslado" ? "success" : t === "venta" ? "secondary" : "danger"}
                valor={resumen.porTipo[t].n}
              />
            ))}
            <KpiAnimado
              definition="Personas distintas que registraron al menos un movimiento con estos filtros."
              formato={(n) => String(Math.round(n))}
              hint="registraron movimientos"
              icon="heroicons:users"
              label="Personas activas"
              tone="neutral"
              valor={resumen.personas}
            />
            <KpiAnimado
              definition="Productos distintos que tuvieron algún movimiento con estos filtros."
              formato={(n) => String(Math.round(n))}
              hint="tuvieron movimiento"
              icon="heroicons:cube"
              label="Productos movidos"
              tone="neutral"
              valor={resumen.productos}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <ChartPanel
              className="xl:col-span-2"
              empty={sinMov || activas.length === 0}
              height={330}
              option={opcionDias}
              question={`¿Cuánto se mueve ${cubos.porSemana ? "cada semana" : "cada día"}? Haz clic en un color de la leyenda para ocultarlo.`}
              stale={loading}
              table={tablaDeSeries(cubos.porSemana ? "Semana" : "Día", cubos.etiquetas, seriesDias, cant)}
              title={cubos.porSemana ? "Movimientos por semana" : "Movimientos por día"}
            />
            <ChartPanel
              empty={activas.length === 0}
              height={330}
              option={opcionTipo}
              question="¿Qué tipo de movimiento pesa más? Haz clic en un color para filtrar."
              stale={loading}
              table={{
                head: ["Tipo", "Cantidad", "Parte"],
                rows: totalesTipo.map((x) => [INFO[x.t].plural, cant(x.valor), totalGeneral ? `${Math.round((x.valor / totalGeneral) * 100)}%` : "0%"]),
              }}
              title="Qué se movió"
              onClick={(p) => {
                const t = TIPOS.find((x) => INFO[x].plural === p.name);

                if (t) alternar("tipo", t);
              }}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <ChartPanel
              empty={activas.length === 0}
              height={Math.max(300, rankQuien.length * 44 + 60)}
              option={opcionQuien}
              question="¿Quién registra más movimientos? Haz clic en una barra para ver solo a esa persona."
              stale={loading}
              table={tablaRank(rankQuien, "Persona")}
              title="Quién mueve más"
              onClick={(p) => {
                const id = idPorNombre.get(String(p.name));

                if (id !== undefined) alternar("quien", String(id));
              }}
            />
            <ChartPanel
              empty={activas.length === 0}
              height={Math.max(300, rankProducto.length * 36 + 60)}
              option={opcionProducto}
              question="¿Qué productos se mueven más? Pasa el mouse por una barra para ver cada cuántos días se saca."
              stale={loading}
              table={tablaRank(rankProducto, "Producto")}
              title="Qué productos se mueven más"
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
          </div>

          <ChartPanel
            empty={activas.length === 0}
            height={360}
            option={opcionHora}
            question="¿En qué días y a qué hora se mueve más mercadería? Cuanto más oscuro, más movimientos."
            stale={loading}
            title="¿Cuándo se mueve más?"
          />

          <TablaBuscable
            clave={(l) => l.id}
            columnas={columnas}
            claseFila={(l) => (l.anulado ? "text-gray-400" : "")}
            filas={filtradas}
            orden={{ clave: "fecha", desc: true }}
            porPagina={20}
            subtitulo={`Qué se movió, cuánto y quién lo hizo.${hayFiltros ? " Sigue los filtros de arriba." : ""} Los anulados aparecen tachados.${data.lineasRecortadas ? " Hay más movimientos de los que se pueden mostrar: acorta el rango de fechas." : ""}`}
            titulo="Registro de movimientos"
            buscar={(l) => [l.producto, l.lote, l.referencia, l.detalle, l.usuario, l.categoria].join(" ")}
          />

          {/* Cómo está el almacén hoy: no depende de los filtros */}
          <div className="space-y-3">
            <div className="px-1">
              <h3 className="font-bold text-base">Cómo está el almacén hoy</h3>
              <p className="text-xs text-gray-500">Estas cifras no dependen de los filtros de arriba.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Kpi
                definition="Lotes que llevan 15 días o más en la bodega sin pasar al estante (sin contar los ya vencidos)."
                hint="15 días o más sin pasar al estante"
                icon="heroicons:archive-box"
                label="Lotes esperando en bodega"
                tone={data.esperando.length ? "danger" : "success"}
                value={String(data.esperando.length)}
              />
            </div>

            {/* (Se quitaron «Tarda en llegar al estante» y «Productos que no cuadran»: no ayudaban a decidir). */}
            {data.esperando.map((l) => (
              <div key={`${l.producto}-${l.lote}`} className="rounded-2xl border border-default-200 bg-white shadow-sm p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Icon height="22" icon="heroicons:archive-box" width="22" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{l.producto}</p>
                  <p className="text-sm text-gray-600">
                    Lote {l.lote} · ingresó el {fechaEs(l.ingreso)} ({l.dias} días) · {cant(l.unidadesEnBodega)} {l.unidadBase} en bodega
                    {l.vence && <> · vence el {fechaEs(l.vence)}</>}
                  </p>
                </div>
              </div>
            ))}

          </div>

          <p className="text-xs text-gray-500 px-1">
            Entrada = compra que llega a la bodega (figura quien validó la recepción) · Al estante = pasar producto de la bodega al estante · Venta = producto
            vendido en caja · Ajuste = corrección de stock con motivo. «Unidades» suma las unidades base de cada producto (kg, litros, unidades…).
          </p>
        </>
      )}
    </PaginaReporte>
  );
}
