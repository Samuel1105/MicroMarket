"use client";

import { Chip } from "@heroui/react";
import React, { useMemo, useState } from "react";

import { getCatalogoClientes, getVentasDatos } from "@/actions/reportes/datos-reportes";
import ChartPanel from "@/components/reports/kit/ChartPanel";
import FilterBar, { FilterDim, Filters } from "@/components/reports/kit/FilterBar";
import KpiAnimado from "@/components/reports/kit/KpiAnimado";
import PaginaReporte from "@/components/reports/kit/PaginaReporte";
import Segmented from "@/components/reports/kit/Segmented";
import TablaBuscable, { Columna } from "@/components/reports/kit/TablaBuscable";
import { crearCubos, fechaEs } from "@/components/reports/kit/fechas";
import { opcionBarrasH, opcionColumnas, opcionDona, tablaDeSeries } from "@/components/reports/kit/opciones";
import { useReporte } from "@/components/reports/kit/useReporte";
import { expandir, filtrarVentas, FilaVenta } from "@/components/reports/kit/ventas";
import { ReportRange } from "@/components/reports/ReportHeader";
import { hoyBolivia } from "@/src/utils/date";
import { getCurrentMonthRange } from "@/src/utils/report-dates";
import { bs, num, pct, variacion } from "@/src/utils/report-format";

/** Un cliente que no compra hace más de estos días se considera "en riesgo" */
const DIAS_RIESGO = 30;

type Segmento = "vip" | "frecuente" | "ocasional" | "una";
const SEG: Record<Segmento, { label: string; color: string; chip: "success" | "primary" | "warning" | "default"; ayuda: string }> = {
  vip: { label: "VIP", color: "#2a78d6", chip: "success", ayuda: "5 compras o más y Bs 500 o más" },
  frecuente: { label: "Frecuente", color: "#1baf7a", chip: "primary", ayuda: "3 o 4 compras" },
  ocasional: { label: "Ocasional", color: "#eda100", chip: "warning", ayuda: "2 compras" },
  una: { label: "Una sola compra", color: "#a5adba", chip: "default", ayuda: "1 compra en el período" },
};
const SEGMENTOS = Object.keys(SEG) as Segmento[];

// Segmento del cliente (solo con compras del período): VIP = 5+ compras y Bs 500+ · Frecuente = 3–4 · Ocasional = 2 · Una sola = 1
// "Se fue" = 2+ compras y más de DIAS_RIESGO (30) días sin comprar. Los umbrales son del sistema, no salen del documento.
function segmentar(compras: number, gasto: number): Segmento {
  if (compras >= 5 && gasto >= 500) return "vip";
  if (compras >= 3) return "frecuente";
  if (compras === 2) return "ocasional";

  return "una";
}

type Cli = {
  id: number;
  nombre: string;
  carnet: string;
  compras: number;
  gasto: number;
  ticket: number;
  ultima: string;
  segmento: Segmento;
  esNuevo: boolean;
};

export default function CustomerAnalysisReport() {
  const [range, setRange] = useState<ReportRange>(getCurrentMonthRange());
  const ventasQ = useReporte(getVentasDatos, range);
  const histQ = useReporte(getCatalogoClientes, range);
  const data = ventasQ.data;
  const loading = ventasQ.loading || histQ.loading;
  const [filtros, setFiltros] = useState<Filters>({});
  const [topN, setTopN] = useState<10 | 20>(10);
  const [medida, setMedida] = useState<"bs" | "n">("bs");

  const { filas, previas } = useMemo(() => (data ? expandir(data) : { filas: [], previas: [] }), [data]);
  // Se filtra primero por lo que no depende de la persona; cliente y segmento se aplican sobre los clientes ya agrupados
  const base = useMemo(() => filtrarVentas(filas, { ...filtros, cliente: [] }), [filas, filtros]);
  const basePrev = useMemo(() => filtrarVentas(previas, { ...filtros, cliente: [] }), [previas, filtros]);
  const cubos = useMemo(() => (data ? crearCubos(data.rango.start, data.rango.end) : null), [data]);
  const historial = useMemo(() => new Map((histQ.data?.clientes ?? []).map((c) => [c.id, c])), [histQ.data]);

  const clientesTodos = useMemo<Cli[]>(() => {
    const m = new Map<number, { f: FilaVenta[]; ventas: Set<number>; gasto: number; ultima: string }>();

    for (const x of base) {
      if (x.cliente.general) continue;
      const a = m.get(x.cliente.id) ?? { f: [], ventas: new Set<number>(), gasto: 0, ultima: "" };

      a.f.push(x);
      a.ventas.add(x.venta);
      a.gasto += x.importe;
      if (x.dia > a.ultima) a.ultima = x.dia;
      m.set(x.cliente.id, a);
    }

    return Array.from(m.entries()).map(([id, a]) => {
      const c = a.f[0].cliente;
      const compras = a.ventas.size;

      return {
        id,
        nombre: c.nombre,
        carnet: c.carnet,
        compras,
        gasto: a.gasto,
        ticket: a.gasto / compras,
        ultima: a.ultima,
        segmento: segmentar(compras, a.gasto),
        esNuevo: (historial.get(id)?.primera ?? "9999") >= (data?.rango.start ?? ""),
      };
    });
  }, [base, historial, data]);

  const clientes = useMemo(
    () =>
      clientesTodos
        .filter((c) => (!filtros.cliente?.length || filtros.cliente.includes(String(c.id))) && (!filtros.segmento?.length || filtros.segmento.includes(c.segmento)))
        .sort((a, b) => b.gasto - a.gasto),
    [clientesTodos, filtros.cliente, filtros.segmento],
  );
  const idsVisibles = useMemo(() => new Set(clientes.map((c) => c.id)), [clientes]);

  // Filas que quedan: de clientes visibles + (cliente general solo si no se filtró por cliente/segmento)
  const hayFiltroPersona = !!(filtros.cliente?.length || filtros.segmento?.length);
  const filasVisibles = useMemo(
    () => base.filter((x) => (x.cliente.general ? !hayFiltroPersona : idsVisibles.has(x.cliente.id))),
    [base, idsVisibles, hayFiltroPersona],
  );

  const dims = useMemo<FilterDim[]>(() => {
    const vend = new Map((data?.vendedores ?? []).map((v) => [String(v.id), v.nombre]));
    const cli = new Map((data?.clientes ?? []).filter((c) => !c.general).map((c) => [String(c.id), c.nombre]));

    return [
      { key: "segmento", label: "Tipo de cliente", icon: "heroicons:star", options: SEGMENTOS, show: (v) => SEG[v as Segmento].label },
      { key: "cliente", label: "Cliente", icon: "heroicons:users", options: Array.from(cli.keys()).sort((a, b) => (cli.get(a) ?? "").localeCompare(cli.get(b) ?? "")), show: (v) => cli.get(v) ?? v },
      { key: "vendedor", label: "Vendedor", icon: "heroicons:user", options: Array.from(vend.keys()), show: (v) => vend.get(v) ?? v },
      { key: "categoria", label: "Categoría", icon: "heroicons:tag", options: Array.from(new Set((data?.productos ?? []).map((p) => p.categoria))).sort((a, b) => a.localeCompare(b)) },
      { key: "producto", label: "Producto", icon: "heroicons:cube", options: Array.from(new Set((data?.productos ?? []).map((p) => p.nombre))).sort((a, b) => a.localeCompare(b)) },
    ];
  }, [data]);

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
  const importeIdent = filasVisibles.filter((x) => !x.cliente.general).reduce((s, x) => s + x.importe, 0);
  const importeTotal = filasVisibles.reduce((s, x) => s + x.importe, 0);
  const comprasIdent = clientes.reduce((s, c) => s + c.compras, 0);
  const activosPrev = new Set(basePrev.filter((x) => !x.cliente.general).map((x) => x.cliente.id)).size;
  const nuevos = clientes.filter((c) => c.esNuevo).length;
  const hoy = hoyBolivia();
  const dias = (d: string) => Math.round((new Date(`${hoy}T00:00:00Z`).getTime() - new Date(`${d}T00:00:00Z`).getTime()) / 86400000);

  const enRiesgo = useMemo(
    () =>
      (histQ.data?.clientes ?? [])
        .filter((c) => c.compras >= 2 && dias(c.ultima) > DIAS_RIESGO && (!filtros.cliente?.length || filtros.cliente.includes(String(c.id))))
        .map((c) => ({ ...c, sinComprar: dias(c.ultima) }))
        .sort((a, b) => b.gasto - a.gasto),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [histQ.data, filtros.cliente, hoy],
  );

  // ── Gráficos ──
  const porSegmento = SEGMENTOS.map((s) => ({ s, n: clientes.filter((c) => c.segmento === s).length, gasto: clientes.filter((c) => c.segmento === s).reduce((t, c) => t + c.gasto, 0) }));
  const opcionSeg = useMemo(
    () =>
      opcionDona({
        datos: porSegmento.map((x) => ({ name: SEG[x.s].label, value: x.n, color: SEG[x.s].color })),
        centro: { texto: num(clientes.length), sub: "clientes" },
        fmt: (n) => `${num(n)} ${n === 1 ? "cliente" : "clientes"}`,
        seleccion: (filtros.segmento ?? []).map((s) => SEG[s as Segmento].label),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clientes, filtros.segmento],
  );

  const top = useMemo(() => clientes.slice(0, topN), [clientes, topN]);
  const opcionTop = useMemo(
    () =>
      opcionBarrasH({
        nombres: top.map((c) => c.nombre),
        series: [{ name: "Gastó", color: "#2a78d6", valores: top.map((c) => (medida === "bs" ? c.gasto : c.compras)) }],
        colorPorBarra: top.map((c) => SEG[c.segmento].color),
        fmt: (n) => (medida === "bs" ? bs(n, 0) : `${num(n)} ${n === 1 ? "compra" : "compras"}`),
        seleccion: (filtros.cliente ?? []).map((id) => clientesTodos.find((c) => String(c.id) === id)?.nombre ?? ""),
        pie: (nombre) => {
          const c = top.find((x) => x.nombre === nombre);

          return c ? `${SEG[c.segmento].label} · ${c.compras} compras · ticket ${bs(c.ticket, 0)}` : undefined;
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [top, medida, filtros.cliente],
  );

  const ventasDiarias = useMemo(() => {
    if (!cubos) return [];
    const con = cubos.claves.map(() => 0);
    const sin = cubos.claves.map(() => 0);
    const visto = new Set<number>();

    for (const x of filasVisibles) {
      const i = cubos.indice(x.dia);

      if (medida === "bs") (x.cliente.general ? sin : con)[i] += x.importe;
      else if (!visto.has(x.venta)) {
        visto.add(x.venta);
        (x.cliente.general ? sin : con)[i] += 1;
      }
    }

    return [
      { name: "Con carnet", color: "#2a78d6", data: con },
      { name: "Cliente general (sin datos)", color: "#a5adba", data: sin },
    ];
  }, [cubos, filasVisibles, medida]);

  const opcionVentas = useMemo(
    () => (cubos ? opcionColumnas({ etiquetas: cubos.etiquetas, series: ventasDiarias, apilado: true, fmt: (n) => (medida === "bs" ? bs(n, 0) : `${num(n)} ventas`) }) : {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cubos, ventasDiarias, medida],
  );

  const nuevosVsRecurrentes = useMemo(() => {
    if (!cubos) return [];
    const nuevo = cubos.claves.map(() => new Set<number>());
    const recurrente = cubos.claves.map(() => new Set<number>());
    const esNuevo = new Map(clientesTodos.map((c) => [c.id, c.esNuevo]));

    for (const x of filasVisibles) {
      if (x.cliente.general) continue;
      (esNuevo.get(x.cliente.id) ? nuevo : recurrente)[cubos.indice(x.dia)].add(x.cliente.id);
    }

    return [
      { name: "Clientes nuevos", color: "#1baf7a", data: nuevo.map((s) => s.size) },
      { name: "Ya compraban antes", color: "#2a78d6", data: recurrente.map((s) => s.size) },
    ];
  }, [cubos, filasVisibles, clientesTodos]);

  const opcionNuevos = useMemo(
    () => (cubos ? opcionColumnas({ etiquetas: cubos.etiquetas, series: nuevosVsRecurrentes, apilado: true, fmt: (n) => `${num(n)} ${n === 1 ? "cliente" : "clientes"}` }) : {}),
    [cubos, nuevosVsRecurrentes],
  );

  const columnas: Columna<Cli>[] = [
    { clave: "nombre", titulo: "Cliente", valor: (c) => c.nombre, celda: (c) => <span className="font-semibold">{c.nombre}</span> },
    { clave: "carnet", titulo: "Carnet", valor: (c) => c.carnet },
    { clave: "gasto", titulo: "Gastó", alinear: "der", valor: (c) => c.gasto, celda: (c) => <b>{bs(c.gasto, 0)}</b> },
    { clave: "compras", titulo: "Compras", alinear: "der", valor: (c) => c.compras },
    { clave: "ticket", titulo: "Ticket", alinear: "der", valor: (c) => c.ticket, celda: (c) => bs(c.ticket, 0) },
    { clave: "ultima", titulo: "Última compra", alinear: "der", valor: (c) => c.ultima, celda: (c) => fechaEs(c.ultima) },
    {
      clave: "segmento",
      titulo: "Tipo",
      valor: (c) => SEG[c.segmento].label,
      celda: (c) => (
        <span className="inline-flex items-center gap-1.5 flex-wrap">
          <Chip color={SEG[c.segmento].chip} size="sm" variant="flat">
            {SEG[c.segmento].label}
          </Chip>
          {c.esNuevo && (
            <Chip color="success" size="sm" variant="dot">
              nuevo
            </Chip>
          )}
        </span>
      ),
    },
  ];

  const sinDatos = filasVisibles.length === 0;

  return (
    <PaginaReporte
      cargando={loading}
      crumb="Análisis de clientes"
      error={ventasQ.error ?? histQ.error}
      listo={!!data && !!cubos && !!histQ.data}
      onRango={setRange}
      pregunta="¿Quiénes compran, cuánto y a quién conviene recuperar?"
      rango={range}
      roles={[1, 4]}
      titulo="Análisis de clientes"
    >
      {data && cubos && (
        <>
          <FilterBar dims={dims} value={filtros} onChange={setFiltros}>
            <span className="text-xs text-gray-500 hidden sm:inline">Medir en</span>
            <Segmented
              label="Medir en"
              options={[
                { value: "bs", label: "Bolivianos" },
                { value: "n", label: "N.º de compras" },
              ]}
              value={medida}
              onChange={setMedida}
            />
          </FilterBar>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <KpiAnimado
              definition="Clientes con carnet que compraron en el período."
              delta={variacion(clientes.length, activosPrev)}
              formato={(n) => String(Math.round(n))}
              hint="con compras"
              icon="heroicons:users"
              label="Clientes activos"
              valor={clientes.length}
            />
            <KpiAnimado
              definition="Clientes cuya primera compra en el negocio fue dentro del período."
              formato={(n) => String(Math.round(n))}
              hint={`${clientes.length - nuevos} ya compraban antes`}
              icon="heroicons:user-plus"
              label="Clientes nuevos"
              tone="success"
              valor={nuevos}
            />
            <KpiAnimado
              definition="Lo que deja cada compra de un cliente con carnet."
              formato={(n) => bs(n, 0)}
              hint="por compra"
              icon="heroicons:shopping-bag"
              label="Ticket"
              tone="secondary"
              valor={comprasIdent ? importeIdent / comprasIdent : 0}
            />
            <KpiAnimado
              definition="Parte de lo vendido que se hizo a clientes con carnet. El resto fue a «cliente general» y no se puede analizar."
              formato={(n) => pct(n, 0)}
              hint="el resto es cliente general"
              icon="heroicons:identification"
              label="Con carnet"
              tone="neutral"
              valor={importeTotal ? (importeIdent / importeTotal) * 100 : 0}
            />
            <KpiAnimado
              definition={`Clientes que compraron 2 veces o más y llevan más de ${DIAS_RIESGO} días sin volver.`}
              formato={(n) => String(Math.round(n))}
              hint={`más de ${DIAS_RIESGO} días sin comprar`}
              icon="heroicons:exclamation-triangle"
              label="Se fueron"
              tone={enRiesgo.length ? "danger" : "success"}
              valor={enRiesgo.length}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <ChartPanel
              empty={clientes.length === 0}
              height={330}
              option={opcionSeg}
              question="¿Qué tipo de clientes tienes? Haz clic en un color para filtrar."
              stale={loading}
              table={{
                head: ["Tipo", "Clientes", "Gastaron", "Cómo se calcula"],
                rows: porSegmento.map((x) => [SEG[x.s].label, x.n, bs(x.gasto, 0), SEG[x.s].ayuda]),
              }}
              title="Tipos de cliente"
              onClick={(p) => {
                const s = SEGMENTOS.find((x) => SEG[x].label === p.name);

                if (s) alternar("segmento", s);
              }}
            />
            <ChartPanel
              className="xl:col-span-2"
              empty={clientes.length === 0}
              height={Math.max(330, top.length * 34 + 40)}
              option={opcionTop}
              question="¿Quiénes son los que más compran? El color es su tipo. Haz clic en una barra para ver solo a ese cliente."
              stale={loading}
              table={{
                head: ["Cliente", "Gastó", "Compras", "Tipo"],
                rows: top.map((c) => [c.nombre, bs(c.gasto, 0), c.compras, SEG[c.segmento].label]),
              }}
              title="Los que más compran"
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
              onClick={(p) => {
                const c = clientesTodos.find((x) => x.nombre === p.name);

                if (c) alternar("cliente", String(c.id));
              }}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <ChartPanel
              empty={sinDatos}
              height={300}
              option={opcionVentas}
              question="¿Cuánto se vende a clientes con carnet y cuánto a «cliente general»? Registrar al cliente permite conocerlo."
              stale={loading}
              table={tablaDeSeries(cubos.porSemana ? "Semana" : "Día", cubos.etiquetas, ventasDiarias, (n) => (medida === "bs" ? bs(n, 0) : num(n)))}
              title="Con carnet o sin datos"
            />
            <ChartPanel
              empty={clientes.length === 0}
              height={300}
              option={opcionNuevos}
              question={`¿Llegan clientes nuevos o compran los de siempre? (clientes distintos por ${cubos.porSemana ? "semana" : "día"})`}
              stale={loading}
              table={tablaDeSeries(cubos.porSemana ? "Semana" : "Día", cubos.etiquetas, nuevosVsRecurrentes, (n) => String(n))}
              title="Nuevos y de siempre"
            />
          </div>

          <TablaBuscable
            clave={(c) => String(c.id)}
            columnas={columnas}
            filas={clientes}
            orden={{ clave: "gasto", desc: true }}
            porPagina={10}
            subtitulo="Clientes con carnet que compraron en el período."
            titulo="Clientes del período"
            buscar={(c) => `${c.nombre} ${c.carnet} ${SEG[c.segmento].label}`}
          />

          <TablaBuscable
            clave={(c) => String(c.id)}
            columnas={[
              { clave: "nombre", titulo: "Cliente", valor: (c) => c.nombre, celda: (c) => <span className="font-semibold">{c.nombre}</span> },
              { clave: "carnet", titulo: "Carnet", valor: (c) => c.carnet },
              { clave: "correo", titulo: "Correo", valor: (c) => c.correo },
              { clave: "sin", titulo: "Días sin comprar", alinear: "der", valor: (c) => c.sinComprar, celda: (c) => <span className="text-red-600 font-semibold">{c.sinComprar}</span> },
              { clave: "ultima", titulo: "Última compra", alinear: "der", valor: (c) => c.ultima, celda: (c) => fechaEs(c.ultima) },
              { clave: "compras", titulo: "Compras antes", alinear: "der", valor: (c) => c.compras },
              { clave: "gasto", titulo: "Gastó en total", alinear: "der", valor: (c) => c.gasto, celda: (c) => bs(c.gasto, 0) },
            ]}
            filas={enRiesgo}
            orden={{ clave: "gasto", desc: true }}
            porPagina={8}
            subtitulo={`Compraron 2 veces o más y llevan más de ${DIAS_RIESGO} días sin volver. Contáctalos para recuperarlos.`}
            titulo="Clientes que dejaron de comprar"
            vacio="Ningún cliente habitual dejó de comprar. ¡Buen trabajo!"
            buscar={(c) => `${c.nombre} ${c.carnet} ${c.correo}`}
          />
        </>
      )}
    </PaginaReporte>
  );
}
