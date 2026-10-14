"use client";

import { Chip } from "@heroui/react";
import React, { useMemo, useState } from "react";

import { getWarehouseInventory, ProductoAlmacen } from "@/actions/reportes/reporte-almacen";
import ChartPanel from "@/components/reports/kit/ChartPanel";
import FilterBar, { FilterDim, Filters } from "@/components/reports/kit/FilterBar";
import KpiAnimado from "@/components/reports/kit/KpiAnimado";
import PaginaReporte from "@/components/reports/kit/PaginaReporte";
import Segmented from "@/components/reports/kit/Segmented";
import TablaBuscable, { Columna } from "@/components/reports/kit/TablaBuscable";
import { mapaColores } from "@/components/reports/kit/colores";
import { base, legendTop, tipHtml, tooltipBase, valueAxis } from "@/components/reports/kit/chart-kit";
import { fechaEs } from "@/components/reports/kit/fechas";
import { opcionDona } from "@/components/reports/kit/opciones";
import { useReporte } from "@/components/reports/kit/useReporte";
import { bs, num } from "@/src/utils/report-format";

type Estado = "sin" | "bajo" | "ok";
const ESTADO: Record<Estado, { label: string; chip: "danger" | "warning" | "success"; orden: number }> = {
  sin: { label: "Sin stock", chip: "danger", orden: 0 },
  bajo: { label: "Poco stock", chip: "warning", orden: 1 },
  ok: { label: "Bien", chip: "success", orden: 2 },
};

const cant = (n: number) => num(n, n % 1 ? 1 : 0);
const cargar = async () => getWarehouseInventory();

export default function WarehouseInventoryReport() {
  const { data, loading, error } = useReporte(cargar, { start: "", end: "" });
  const [filtros, setFiltros] = useState<Filters>({});
  const [topN, setTopN] = useState<10 | 20>(10);

  const productos = useMemo(() => data?.productos ?? [], [data]);
  const filtrados = useMemo(
    () =>
      productos.filter(
        (p) =>
          (!filtros.categoria?.length || filtros.categoria.includes(p.categoria)) &&
          (!filtros.estado?.length || filtros.estado.includes(p.estado)) &&
          (!filtros.producto?.length || filtros.producto.includes(p.nombre)),
      ),
    [productos, filtros],
  );
  const colorCat = useMemo(() => mapaColores(productos.map((p) => p.categoria)), [productos]);

  const dims = useMemo<FilterDim[]>(
    () => [
      { key: "estado", label: "Estado", icon: "heroicons:signal", options: ["sin", "bajo", "ok"], show: (v) => ESTADO[v as Estado].label },
      { key: "categoria", label: "Categoría", icon: "heroicons:tag", options: Array.from(new Set(productos.map((p) => p.categoria))).sort((a, b) => a.localeCompare(b)) },
      { key: "producto", label: "Producto", icon: "heroicons:cube", options: productos.map((p) => p.nombre).sort((a, b) => a.localeCompare(b)) },
    ],
    [productos],
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

  // ── Cifras ──
  const valorTotal = filtrados.reduce((s, p) => s + p.valor, 0);
  const sinStock = filtrados.filter((p) => p.estado === "sin").length;
  const bajo = filtrados.filter((p) => p.estado === "bajo").length;
  const lotes = useMemo(() => filtrados.flatMap((p) => p.lotes.map((l) => ({ ...l, producto: p.nombre, unidad: p.unidadBase }))), [filtrados]);
  // Valor = unidades que tienes × costo promedio de compra de cada unidad
  const valorPorVencer = lotes.filter((l) => l.diasParaVencer !== null && l.diasParaVencer >= 0 && l.diasParaVencer <= 30).reduce((s, l) => s + l.valor, 0);
  const vencidosSinRetirar = lotes.filter((l) => l.diasParaVencer !== null && l.diasParaVencer < 0);
  const valorParado = filtrados.filter((p) => p.parado).reduce((s, p) => s + p.valor, 0);

  // ── Gráfico 1: stock vs mínimo (lo más urgente primero) ──
  const urgentes = useMemo(
    () =>
      [...filtrados]
        .sort((a, b) => ESTADO[a.estado].orden - ESTADO[b.estado].orden || (a.cobertura ?? 999) - (b.cobertura ?? 999) || a.total / (a.minimo || 1) - b.total / (b.minimo || 1))
        .slice(0, topN),
    [filtrados, topN],
  );

  const opcionStock = useMemo(
    () => ({
      ...base,
      grid: { left: 4, right: 24, top: 40, bottom: 4, containLabel: true },
      legend: { ...legendTop, data: ["En el almacén", "En el estante", "Stock mínimo"] },
      tooltip: {
        ...tooltipBase,
        trigger: "axis",
        axisPointer: { type: "shadow", shadowStyle: { color: "rgba(11,58,85,.06)" } },
        formatter: (ps: any[]) => {
          const p = urgentes.find((x) => x.nombre === ps[0].axisValue);

          return p
            ? tipHtml(
                p.nombre,
                [
                  { color: "#2a78d6", name: "En el almacén", value: `${cant(p.almacen)} ${p.unidadBase}` },
                  { color: "#1baf7a", name: "En el estante", value: `${cant(p.estante)} ${p.unidadBase}` },
                  { color: "#e34948", name: "Stock mínimo", value: `${cant(p.minimo)} ${p.unidadBase}` },
                ],
                ESTADO[p.estado].label + (p.reponer ? ` · conviene comprar ${cant(p.reponer)} ${p.unidadBase}` : ""),
              )
            : "";
        },
      },
      xAxis: valueAxis,
      yAxis: { type: "category", inverse: true, data: urgentes.map((p) => p.nombre), axisTick: { show: false }, axisLine: { lineStyle: { color: "#e2e8f0" } }, axisLabel: { color: "#334155", fontSize: 12, width: 150, overflow: "truncate" } },
      series: [
        {
          name: "En el almacén",
          type: "bar",
          stack: "s",
          barMaxWidth: 24,
          itemStyle: { color: "#2a78d6", borderColor: "#fff", borderWidth: 1.5, borderRadius: 3 },
          data: urgentes.map((p) => ({ value: p.almacen, itemStyle: { opacity: filtros.producto?.length && !filtros.producto.includes(p.nombre) ? 0.3 : 1 } })),
        },
        {
          name: "En el estante",
          type: "bar",
          stack: "s",
          barMaxWidth: 24,
          itemStyle: { color: "#1baf7a", borderColor: "#fff", borderWidth: 1.5, borderRadius: 3 },
          data: urgentes.map((p) => ({ value: p.estante, itemStyle: { opacity: filtros.producto?.length && !filtros.producto.includes(p.nombre) ? 0.3 : 1 } })),
        },
        {
          name: "Stock mínimo",
          type: "scatter",
          symbol: "rect",
          symbolSize: [4, 30],
          z: 10,
          itemStyle: { color: "#e34948" },
          data: urgentes.map((p) => [p.minimo, p.nombre]),
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [urgentes, filtros.producto],
  );

  // ── Gráfico 2: cuántos días alcanza ──
  const conRitmo = useMemo(() => [...filtrados].filter((p) => p.cobertura !== null && p.total > 0).sort((a, b) => a.cobertura! - b.cobertura!).slice(0, topN), [filtrados, topN]);
  const colorDias = (d: number) => (d < 7 ? "#e34948" : d < 15 ? "#eda100" : "#1baf7a");
  const opcionDias = useMemo(
    () => ({
      ...base,
      grid: { left: 4, right: 56, top: 12, bottom: 4, containLabel: true },
      tooltip: {
        ...tooltipBase,
        trigger: "axis",
        axisPointer: { type: "shadow", shadowStyle: { color: "rgba(11,58,85,.06)" } },
        formatter: (ps: any[]) => {
          const p = conRitmo.find((x) => x.nombre === ps[0].axisValue);

          return p
            ? tipHtml(p.nombre, [{ color: colorDias(p.cobertura!), name: "Alcanza para", value: `${num(p.cobertura!, 0)} días` }], `Se vende ${num(p.ventaDiaria, 1)} ${p.unidadBase} por día · hay ${cant(p.total)} ${p.unidadBase}`)
            : "";
        },
      },
      xAxis: { ...valueAxis, axisLabel: { ...valueAxis.axisLabel, formatter: (v: number) => `${v} d` } },
      yAxis: { type: "category", inverse: true, data: conRitmo.map((p) => p.nombre), axisTick: { show: false }, axisLine: { lineStyle: { color: "#e2e8f0" } }, axisLabel: { color: "#334155", fontSize: 12, width: 150, overflow: "truncate" } },
      series: [
        {
          type: "bar",
          barMaxWidth: 24,
          label: { show: true, position: "right", color: "#0f172a", fontSize: 11, fontWeight: 600, formatter: (p: any) => `${Math.round(p.value)} días` },
          data: conRitmo.map((p) => ({
            value: Math.min(p.cobertura!, 90),
            itemStyle: { color: colorDias(p.cobertura!), borderRadius: [0, 8, 8, 0], opacity: filtros.producto?.length && !filtros.producto.includes(p.nombre) ? 0.3 : 1 },
          })),
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conRitmo, filtros.producto],
  );

  // ── Gráfico 3: valor por categoría ──
  const porCategoria = useMemo(() => {
    const m = new Map<string, number>();

    filtrados.filter((p) => p.total > 0).forEach((p) => m.set(p.categoria, (m.get(p.categoria) ?? 0) + p.valor));

    return Array.from(m.entries())
      .map(([nombre, valor]) => ({ nombre, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [filtrados]);
  const opcionCat = useMemo(
    () =>
      opcionDona({
        datos: porCategoria.map((c) => ({ name: c.nombre, value: c.valor, color: colorCat(c.nombre) })),
        centro: { texto: bs(valorTotal, 0), sub: "en mercadería" },
        fmt: (n) => bs(n, 0),
        seleccion: filtros.categoria ?? [],
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [porCategoria, filtros.categoria],
  );

  // ── Lo que vence: lotes ya vencidos y los que vencen en los próximos 60 días (lo más urgente primero) ──
  // vence en N días = fecha de vencimiento del lote − hoy · valor = unidades que quedan × costo promedio de la unidad
  const porVencer = useMemo(
    () => lotes.filter((l) => l.diasParaVencer !== null && l.diasParaVencer <= 60).sort((a, b) => a.diasParaVencer! - b.diasParaVencer!),
    [lotes],
  );
  const textoDias = (d: number) => (d < 0 ? `Venció hace ${-d} ${d === -1 ? "día" : "días"}` : d === 0 ? "Vence hoy" : d === 1 ? "Vence mañana" : `Vence en ${d} días`);
  const chipDias = (d: number): "danger" | "warning" | "default" => (d <= 7 ? "danger" : d <= 30 ? "warning" : "default");

  const columnas: Columna<ProductoAlmacen>[] = [
    { clave: "nombre", titulo: "Producto", valor: (p) => p.nombre, celda: (p) => <span className="font-semibold">{p.nombre}</span> },
    {
      clave: "categoria",
      titulo: "Categoría",
      valor: (p) => p.categoria,
      celda: (p) => (
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: colorCat(p.categoria) }} />
          {p.categoria}
        </span>
      ),
    },
    { clave: "almacen", titulo: "Almacén", alinear: "der", valor: (p) => p.almacen, celda: (p) => `${cant(p.almacen)} ${p.unidadBase}` },
    { clave: "estante", titulo: "Estante", alinear: "der", valor: (p) => p.estante, celda: (p) => `${cant(p.estante)} ${p.unidadBase}` },
    { clave: "total", titulo: "Total", alinear: "der", valor: (p) => p.total, celda: (p) => <b>{`${cant(p.total)} ${p.unidadBase}`}</b> },
    { clave: "minimo", titulo: "Mínimo", alinear: "der", valor: (p) => p.minimo, celda: (p) => cant(p.minimo) },
    {
      clave: "dias",
      titulo: "Alcanza",
      alinear: "der",
      valor: (p) => p.cobertura ?? 9999,
      celda: (p) =>
        p.cobertura === null ? (
          <span className="text-gray-400">{p.parado ? "no se vende" : "—"}</span>
        ) : (
          <span
            className="block leading-tight"
            title={`Tienes ${cant(p.total)} ${p.unidadBase} y se venden ${num(p.ventaDiaria, 2)} ${p.unidadBase} por día (promedio de los últimos ${data?.diasRitmo ?? 30} días). Entonces: ${cant(p.total)} ÷ ${num(p.ventaDiaria, 2)} = ${num(p.cobertura, 0)} días.`}
          >
            <span className={p.cobertura < 7 ? "text-red-600 font-semibold" : ""}>{`${num(p.cobertura, 0)} días`}</span>
            <span className="block text-[11px] text-gray-400">{`vende ${num(p.ventaDiaria, 1)} ${p.unidadBase}/día`}</span>
          </span>
        ),
    },
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
    { clave: "reponer", titulo: "Conviene comprar", alinear: "der", valor: (p) => p.reponer, celda: (p) =>
        p.reponer ? (
          <span
            className="block leading-tight"
            title={`Conviene tener al menos ${cant(Math.max(p.minimo, p.ventaDiaria * (data?.diasObjetivo ?? 15)))} ${p.unidadBase} (el mayor entre tu stock mínimo y lo que vendes en ${data?.diasObjetivo ?? 15} días). Tienes ${cant(p.total)}, faltan ${cant(p.reponer)}.`}
          >
            <b>{`${cant(p.reponer)} ${p.unidadBase}`}</b>
            <span className="block text-[11px] text-gray-400">{`para tener ${cant(p.total + p.reponer)}`}</span>
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    { clave: "valor", titulo: "Lo que te costó", alinear: "der", valor: (p) => p.valor, celda: (p) => bs(p.valor, 0) },
  ];

  const hoy = data?.hoy ?? "";

  return (
    <PaginaReporte
      cargando={loading}
      crumb="Almacén de productos"
      error={error}
      listo={!!data}
      notaSinRango={`Foto de hoy${hoy ? ` (${fechaEs(hoy)})` : ""}: lo que hay ahora en el almacén y en el estante, y a qué ritmo se vende (últimos ${data?.diasRitmo ?? 30} días).`}
      pregunta="¿Qué hay, qué se está acabando y qué conviene comprar?"
      roles={[1, 4]}
      titulo="Almacén de productos"
    >
      {data && (
        <>
          <FilterBar dims={dims} value={filtros} onChange={setFiltros}>
            <span className="text-xs text-gray-500 hidden sm:inline">Mostrar</span>
            <Segmented
              label="Cantidad a mostrar"
              options={[
                { value: 10, label: "10 productos" },
                { value: 20, label: "20 productos" },
              ]}
              value={topN}
              onChange={setTopN}
            />
          </FilterBar>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <KpiAnimado
              definition="Lo que te costó la mercadería que tienes guardada hoy (en el almacén y en el estante). No es lo que cobrarás al venderla."
              formato={(n) => bs(n, 0)}
              hint={`${filtrados.filter((p) => p.total > 0).length} productos con stock`}
              icon="heroicons:banknotes"
              label="Valor del stock"
              valor={valorTotal}
            />
            <KpiAnimado
              definition="Productos que ya no tienen nada ni en el almacén ni en el estante."
              formato={(n) => String(Math.round(n))}
              hint="hay que comprar"
              icon="heroicons:x-circle"
              label="Sin stock"
              tone={sinStock ? "danger" : "success"}
              valor={sinStock}
            />
            <KpiAnimado
              definition="Productos que tienen menos que su stock mínimo."
              formato={(n) => String(Math.round(n))}
              hint="por debajo del mínimo"
              icon="heroicons:arrow-trending-down"
              label="Poco stock"
              tone={bajo ? "danger" : "success"}
              valor={bajo}
            />
            <KpiAnimado
              definition="Lo que te costó la mercadería que vence en los próximos 30 días y todavía no se vendió."
              formato={(n) => bs(n, 0)}
              hint={vencidosSinRetirar.length ? `y ${vencidosSinRetirar.length} lotes ya vencidos sin retirar` : "vence en 30 días o menos"}
              icon="heroicons:clock"
              label="Por vencer"
              tone={valorPorVencer || vencidosSinRetirar.length ? "danger" : "success"}
              valor={valorPorVencer}
            />
            <KpiAnimado
              definition="Dinero guardado en productos con stock que no se vendieron nada en los últimos 30 días."
              formato={(n) => bs(n, 0)}
              hint="productos que no se mueven"
              icon="heroicons:pause-circle"
              label="Parada"
              tone={valorParado ? "danger" : "success"}
              valor={valorParado}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <ChartPanel
              empty={urgentes.length === 0}
              height={Math.max(320, urgentes.length * 40 + 60)}
              option={opcionStock}
              question="¿Qué se está acabando? La marca roja es el stock mínimo que definiste en cada producto: si la barra no llega, hay que comprar."
              stale={loading}
              table={{
                head: ["Producto", "Almacén", "Estante", "Mínimo", "Estado"],
                rows: urgentes.map((p) => [p.nombre, cant(p.almacen), cant(p.estante), cant(p.minimo), ESTADO[p.estado].label]),
              }}
              title="Stock frente al mínimo"
              onClick={(p) => p.seriesType === "bar" && alternar("producto", String(p.name))}
            />
            <ChartPanel
              empty={conRitmo.length === 0}
              emptyText="Ninguno de estos productos se vendió en los últimos 30 días."
              height={Math.max(320, conRitmo.length * 40 + 60)}
              option={opcionDias}
              question="¿Para cuántos días alcanza lo que hay, al ritmo de venta actual? Rojo: menos de 7 días · amarillo: menos de 15."
              stale={loading}
              table={{ head: ["Producto", "Alcanza", "Se vende por día"], rows: conRitmo.map((p) => [p.nombre, `${num(p.cobertura!, 0)} días`, `${num(p.ventaDiaria, 1)} ${p.unidadBase}`]) }}
              title="¿Cuántos días alcanza?"
              onClick={(p) => alternar("producto", String(p.name))}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <ChartPanel
              empty={porCategoria.length === 0}
              height={320}
              option={opcionCat}
              question="¿En qué categoría tienes más plata guardada? Clic en un color para filtrar."
              stale={loading}
              table={{ head: ["Categoría", "Valor"], rows: porCategoria.map((c) => [c.nombre, bs(c.valor, 0)]) }}
              title="Dinero en mercadería"
              onClick={(p) => alternar("categoria", String(p.name))}
            />
            <div className="xl:col-span-2">
              <TablaBuscable
                clave={(l) => `${l.producto}-${l.numeroLote}`}
                claseFila={(l) => (l.diasParaVencer! < 0 ? "bg-red-50/50" : l.diasParaVencer! <= 7 ? "bg-amber-50/50" : "")}
                columnas={[
                  { clave: "producto", titulo: "Producto", valor: (l) => l.producto, celda: (l) => <span className="font-semibold">{l.producto}</span> },
                  { clave: "estado", titulo: "Cuándo vence", valor: (l) => l.diasParaVencer ?? 9999, celda: (l) => <Chip color={chipDias(l.diasParaVencer!)} size="sm" variant="flat">{textoDias(l.diasParaVencer!)}</Chip> },
                  { clave: "fecha", titulo: "Fecha", alinear: "der", valor: (l) => l.vence ?? "", celda: (l) => (l.vence ? fechaEs(l.vence) : "—") },
                  { clave: "lote", titulo: "Lote", valor: (l) => l.numeroLote },
                  { clave: "unidades", titulo: "Cuánto queda", alinear: "der", valor: (l) => l.unidades, celda: (l) => <b>{`${cant(l.unidades)} ${l.unidad}`}</b> },
                  { clave: "valor", titulo: "Costo", alinear: "der", valor: (l) => l.valor, celda: (l) => bs(l.valor, 0) },
                ]}
                filas={porVencer}
                orden={{ clave: "estado", desc: false }}
                porPagina={6}
                subtitulo="Lotes que ya vencieron y los que vencen en los próximos 60 días, lo más urgente primero. Véndelos primero; los vencidos retíralos con un ajuste de inventario."
                titulo="Qué está por vencer"
                vacio="No hay mercadería vencida ni por vencer en los próximos 60 días."
                buscar={(l) => `${l.producto} ${l.numeroLote}`}
              />
            </div>
          </div>

          <TablaBuscable
            clave={(p) => String(p.id)}
            claseFila={(p) => (p.estado === "sin" ? "bg-red-50/40" : p.estado === "bajo" ? "bg-amber-50/40" : "")}
            columnas={columnas}
            filas={filtrados}
            orden={{ clave: "estado", desc: false }}
            porPagina={10}
// Conviene comprar = max(stock mínimo, venta diaria × diasObjetivo) − stock actual · Alcanza = stock ÷ venta diaria (últimos diasRitmo días)
            subtitulo="Ordenado por lo más urgente. «Conviene comprar» es una sugerencia según tu stock mínimo y lo que vendes; «Alcanza» son los días que dura lo que tienes al ritmo en que vendes (pasa el mouse sobre los días para ver cómo se calculó)."

            titulo="Qué hay y qué conviene comprar"
            buscar={(p) => `${p.nombre} ${p.categoria} ${ESTADO[p.estado].label}`}
          />

          <p className="text-xs text-gray-500 px-1">«Valor» y «Costo» son lo que te costó la mercadería que tienes guardada, no lo que cobrarás al venderla.</p>
        </>
      )}
    </PaginaReporte>
  );
}
