"use client";

import React, { useMemo, useState } from "react";

import { getVentasDatos } from "@/actions/reportes/datos-reportes";
import ChartPanel from "@/components/reports/kit/ChartPanel";
import FilterBar, { FilterDim, Filters } from "@/components/reports/kit/FilterBar";
import Kpi from "@/components/reports/Kpi";
import KpiAnimado from "@/components/reports/kit/KpiAnimado";
import PaginaReporte from "@/components/reports/kit/PaginaReporte";
import Segmented from "@/components/reports/kit/Segmented";
import TablaBuscable, { Columna } from "@/components/reports/kit/TablaBuscable";
import { mapaColores } from "@/components/reports/kit/colores";
import { crearCubos, DIAS_SEMANA, DIAS_SEMANA_LARGO, diaSemanaDe, fechaEs, horaDe } from "@/components/reports/kit/fechas";
import { opcionBarrasH, opcionCalor, opcionColumnas, tablaDeSeries } from "@/components/reports/kit/opciones";
import { useReporte } from "@/components/reports/kit/useReporte";
import { aVentas, expandir, filtrarVentas } from "@/components/reports/kit/ventas";
import { ReportRange } from "@/components/reports/ReportHeader";
import { addDays, diasEnRango, getCurrentMonthRange, rangoAnterior } from "@/src/utils/report-dates";
import { bs, num, variacion } from "@/src/utils/report-format";

type Dia = { dia: string; semana: number; importe: number; ventas: number; anterior: number };

export default function SalesEvolutionReport() {
  const [range, setRange] = useState<ReportRange>(getCurrentMonthRange());
  const { data, loading, error } = useReporte(getVentasDatos, range);
  const [filtros, setFiltros] = useState<Filters>({});
  const [medida, setMedida] = useState<"bs" | "n">("bs");

  const { filas, previas } = useMemo(() => (data ? expandir(data) : { filas: [], previas: [] }), [data]);
  const fil = useMemo(() => filtrarVentas(filas, filtros), [filas, filtros]);
  const filPrev = useMemo(() => filtrarVentas(previas, filtros), [previas, filtros]);
  const ventas = useMemo(() => aVentas(fil), [fil]);
  const ventasPrev = useMemo(() => aVentas(filPrev), [filPrev]);
  const cubos = useMemo(() => (data ? crearCubos(data.rango.start, data.rango.end) : null), [data]);
  const colorCat = useMemo(() => mapaColores((data?.productos ?? []).map((p) => p.categoria)), [data]);

  const peso = (v: { importe: number }) => (medida === "bs" ? v.importe : 1);
  const fmt = (n: number) => (medida === "bs" ? bs(n, 0) : `${num(n)} ${n === 1 ? "venta" : "ventas"}`);

  const dims = useMemo<FilterDim[]>(() => {
    const vend = new Map((data?.vendedores ?? []).map((v) => [String(v.id), v.nombre]));
    const cli = new Map((data?.clientes ?? []).map((c) => [String(c.id), c.nombre]));

    return [
      { key: "vendedor", label: "Vendedor", icon: "heroicons:user", options: Array.from(vend.keys()), show: (v) => vend.get(v) ?? v },
      { key: "categoria", label: "Categoría", icon: "heroicons:tag", options: Array.from(new Set((data?.productos ?? []).map((p) => p.categoria))).sort((a, b) => a.localeCompare(b)) },
      { key: "producto", label: "Producto", icon: "heroicons:cube", options: Array.from(new Set((data?.productos ?? []).map((p) => p.nombre))).sort((a, b) => a.localeCompare(b)) },
      { key: "cliente", label: "Cliente", icon: "heroicons:users", options: Array.from(cli.keys()).sort((a, b) => (cli.get(a) ?? "").localeCompare(cli.get(b) ?? "")), show: (v) => cli.get(v) ?? v },
    ];
  }, [data]);

  // ── Día por día (con el día equivalente del período anterior) ──
  const dias = useMemo<Dia[]>(() => {
    if (!data) return [];
    const prevInicio = rangoAnterior(data.rango.start, data.rango.end).start;
    const m = new Map<string, Dia>();

    for (let i = 0; i < data.rango.dias; i++) {
      const dia = addDays(data.rango.start, i);

      m.set(dia, { dia, semana: (new Date(`${dia}T00:00:00Z`).getUTCDay() + 6) % 7, importe: 0, ventas: 0, anterior: 0 });
    }

    ventas.forEach((v) => {
      const d = m.get(v.dia);

      if (d) {
        d.importe += v.importe;
        d.ventas += 1;
      }
    });
    ventasPrev.forEach((v) => {
      const d = m.get(addDays(data.rango.start, diasEnRango(prevInicio, v.dia) - 1));

      if (d) d.anterior += medida === "bs" ? v.importe : 1;
    });

    return Array.from(m.values());
  }, [data, ventas, ventasPrev, medida]);

  const totalImporte = ventas.reduce((s, v) => s + v.importe, 0);
  const totalPrev = ventasPrev.reduce((s, v) => s + v.importe, 0);
  const conVentas = dias.filter((d) => d.ventas > 0);
  const mejor = [...conVentas].sort((a, b) => b.importe - a.importe)[0];
  const mitad = Math.floor(dias.length / 2);
  const primera = dias.slice(0, mitad).reduce((s, d) => s + d.importe, 0);
  const segunda = dias.slice(dias.length - mitad).reduce((s, d) => s + d.importe, 0);
  // tendencia % = (ventas 2.ª mitad del período − ventas 1.ª mitad) ÷ ventas 1.ª mitad × 100
  const tendencia = mitad >= 3 && primera > 0 ? ((segunda - primera) / primera) * 100 : null;

  // ── Gráfico 1: por día/semana + período anterior ──
  const serieVentas = useMemo(() => {
    if (!cubos) return null;
    const actual = cubos.claves.map(() => 0);
    const anterior = cubos.claves.map(() => 0);

    for (const d of dias) {
      const i = cubos.indice(d.dia);

      actual[i] += medida === "bs" ? d.importe : d.ventas;
      anterior[i] += d.anterior;
    }

    return { actual, anterior };
  }, [cubos, dias, medida]);

  const opcionTiempo = useMemo(
    () =>
      cubos && serieVentas
        ? opcionColumnas({
            etiquetas: cubos.etiquetas,
            series: [{ name: medida === "bs" ? "Vendido" : "Ventas", color: "#2a78d6", data: serieVentas.actual }],
            superpuesta: { name: "Período anterior", color: "#94a3b8", data: serieVentas.anterior },
            fmt,
          })
        : {},
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cubos, serieVentas, medida],
  );

  // ── Gráfico 2: promedio por día de la semana ──
  const semana = useMemo(() => {
    const s = DIAS_SEMANA_LARGO.map((nombre) => ({ nombre, total: 0, veces: 0 }));

    for (const d of dias) {
      s[d.semana].total += medida === "bs" ? d.importe : d.ventas;
      s[d.semana].veces += 1;
    }

    return s.map((x) => ({ ...x, promedio: x.veces ? x.total / x.veces : 0 }));
  }, [dias, medida]);
  const mejorSemana = Math.max(...semana.map((s) => s.promedio), 0);

  const opcionSemana = useMemo(
    () =>
      opcionColumnas({
        etiquetas: DIAS_SEMANA,
        series: [{ name: "Promedio por día", color: "#2a78d6", data: semana.map((s) => s.promedio) }],
        fmt,
        leyenda: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [semana, medida],
  );

  // ── Gráfico 3: día × hora ──
  const calor = useMemo(() => {
    const celdas = new Map<string, number>();
    let hMin = 24;
    let hMax = 0;

    for (const v of ventas) {
      const dow = diaSemanaDe(v.ts);
      const h = horaDe(v.ts);

      celdas.set(`${dow}-${h}`, (celdas.get(`${dow}-${h}`) ?? 0) + peso(v));
      hMin = Math.min(hMin, h);
      hMax = Math.max(hMax, h);
    }

    if (hMin > hMax) return { horas: [] as number[], datos: [] as number[][], max: 0 };
    const horas: number[] = [];

    for (let h = hMin; h <= hMax; h++) horas.push(h);
    const datos: number[][] = [];

    for (let d = 0; d < 7; d++) horas.forEach((h, i) => datos.push([i, d, celdas.get(`${d}-${h}`) ?? 0]));

    return { horas, datos, max: Math.max(...datos.map((x) => x[2]), 1) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventas, medida]);

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

  // ── Gráfico 4: por categoría en el tiempo (áreas apiladas) ──
  const seriesCat = useMemo(() => {
    if (!cubos) return [];
    const cats = Array.from(new Set(fil.map((x) => x.producto.categoria))).sort((a, b) => a.localeCompare(b));

    return cats.map((c) => {
      const d = cubos.claves.map(() => 0);
      const vistos = cubos.claves.map(() => new Set<number>());

      for (const x of fil) {
        if (x.producto.categoria !== c) continue;
        const i = cubos.indice(x.dia);

        if (medida === "bs") d[i] += x.importe;
        else if (!vistos[i].has(x.venta)) {
          vistos[i].add(x.venta);
          d[i] += 1;
        }
      }

      return { name: c, color: colorCat(c), data: d };
    });
  }, [cubos, fil, medida, colorCat]);

  const opcionCategorias = useMemo(
    () => (cubos ? opcionColumnas({ etiquetas: cubos.etiquetas, series: seriesCat, apilado: true, linea: true, fmt }) : {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cubos, seriesCat, medida],
  );

  const columnas: Columna<Dia>[] = [
    { clave: "dia", titulo: "Día", valor: (d) => d.dia, celda: (d) => `${DIAS_SEMANA[d.semana]} ${fechaEs(d.dia)}` },
    { clave: "importe", titulo: "Vendido", alinear: "der", valor: (d) => d.importe, celda: (d) => (d.ventas ? <b>{bs(d.importe, 0)}</b> : <span className="text-gray-400">—</span>) },
    { clave: "ventas", titulo: "Ventas", alinear: "der", valor: (d) => d.ventas },
    { clave: "ticket", titulo: "Ticket", alinear: "der", valor: (d) => (d.ventas ? d.importe / d.ventas : 0), celda: (d) => (d.ventas ? bs(d.importe / d.ventas, 0) : "—") },
  ];

  const sinVentas = ventas.length === 0;

  return (
    <PaginaReporte
      cargando={loading}
      crumb="Evolución de ventas"
      error={error}
      listo={!!data && !!cubos}
      onRango={setRange}
      pregunta="¿Cuándo vendemos más y cómo vamos frente al período anterior?"
      rango={range}
      roles={[1, 4]}
      titulo="Evolución de ventas"
    >
      {data && cubos && (
        <>
          <FilterBar dims={dims} value={filtros} onChange={setFiltros}>
            <span className="text-xs text-gray-500 hidden sm:inline">Medir en</span>
            <Segmented
              label="Medir en"
              options={[
                { value: "bs", label: "Bolivianos" },
                { value: "n", label: "N.º de ventas" },
              ]}
              value={medida}
              onChange={setMedida}
            />
          </FilterBar>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <KpiAnimado
              definition="Total vendido en el período (sin ventas anuladas), comparado con el período anterior de igual duración."
              delta={variacion(totalImporte, totalPrev)}
              formato={(n) => bs(n, 0)}
              hint={`${num(ventas.length)} ventas`}
              icon="heroicons:banknotes"
              label="Vendido"
              valor={totalImporte}
            />
            <KpiAnimado
              definition="Lo que deja cada venta en promedio."
              delta={variacion(ventas.length ? totalImporte / ventas.length : 0, ventasPrev.length ? totalPrev / ventasPrev.length : 0)}
              formato={(n) => bs(n, 0)}
              hint="por venta"
              icon="heroicons:shopping-bag"
              label="Ticket promedio"
              tone="secondary"
              valor={ventas.length ? totalImporte / ventas.length : 0}
            />
            <Kpi
              definition="El día en que más se vendió."
              hint={mejor ? `${bs(mejor.importe, 0)} · ${mejor.ventas} ventas` : "Sin ventas"}
              icon="heroicons:trophy"
              label="Mejor día"
              tone="success"
              value={mejor ? `${DIAS_SEMANA[mejor.semana]} ${fechaEs(mejor.dia).slice(0, 5)}` : "—"}
            />
            <KpiAnimado
              definition="Ventas de la segunda mitad del período frente a la primera mitad: ¿vas subiendo o bajando?"
              formato={(n) => `${n >= 0 ? "+" : ""}${n.toFixed(0)}%`}
              hint="segunda mitad vs primera"
              icon="heroicons:arrow-trending-up"
              label="Tendencia"
              tone={tendencia !== null && tendencia < 0 ? "danger" : "success"}
              valor={tendencia ?? 0}
            />
            <KpiAnimado
              definition="Días del período sin ninguna venta."
              formato={(n) => String(Math.round(n))}
              hint={`de ${dias.length} días`}
              icon="heroicons:calendar-days"
              label="Días sin ventas"
              tone={dias.length - conVentas.length > 0 ? "danger" : "success"}
              valor={dias.length - conVentas.length}
            />
            <Kpi
              definition="El día de la semana que, en promedio, más vende."
              hint={mejorSemana > 0 ? `${fmt(mejorSemana)} en promedio` : "Sin ventas"}
              icon="heroicons:calendar"
              label="Mejor día de la semana"
              tone="neutral"
              value={mejorSemana > 0 ? (semana.find((s) => s.promedio === mejorSemana)?.nombre ?? "—") : "—"}
            />
          </div>

          <ChartPanel
            empty={sinVentas}
            height={340}
            option={opcionTiempo}
            question={`¿Cuánto se vende ${cubos.porSemana ? "cada semana" : "cada día"}? La línea punteada es el período anterior.`}
            stale={loading}
            table={
              serieVentas
                ? tablaDeSeries(
                    cubos.porSemana ? "Semana" : "Día",
                    cubos.etiquetas,
                    [
                      { name: "Actual", color: "", data: serieVentas.actual },
                      { name: "Anterior", color: "", data: serieVentas.anterior },
                    ],
                    (n) => (medida === "bs" ? bs(n, 0) : num(n)),
                    false,
                  )
                : undefined
            }
            title={cubos.porSemana ? "Ventas por semana" : "Ventas por día"}
          />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <ChartPanel
              empty={sinVentas}
              height={320}
              option={opcionSemana}
              question="¿Qué día de la semana se vende más, en promedio?"
              stale={loading}
              table={{ head: ["Día", "Promedio"], rows: semana.map((s) => [s.nombre, medida === "bs" ? bs(s.promedio, 0) : num(s.promedio, 1)]) }}
              title="Cada día de la semana"
            />
            <ChartPanel
              className="xl:col-span-2"
              empty={sinVentas}
              height={320}
              option={opcionHora}
              question="¿A qué hora se vende más? Cuanto más oscuro, más ventas."
              stale={loading}
              title="¿Cuándo se vende más?"
            />
          </div>

          <ChartPanel
            empty={sinVentas}
            height={320}
            option={opcionCategorias}
            question="¿Qué categorías suben o bajan con el tiempo? Pasa el mouse para ver cada una."
            stale={loading}
            table={tablaDeSeries(cubos.porSemana ? "Semana" : "Día", cubos.etiquetas, seriesCat, (n) => (medida === "bs" ? bs(n, 0) : num(n)))}
            title="Por categoría en el tiempo"
          />

          <TablaBuscable
            clave={(d) => d.dia}
            columnas={columnas}
            filas={dias}
            orden={{ clave: "dia", desc: true }}
            porPagina={10}
            subtitulo="Cada día del período, incluso los que no tuvieron ventas."
            titulo="Día por día"
            buscar={(d) => `${DIAS_SEMANA_LARGO[d.semana]} ${fechaEs(d.dia)}`}
          />
          <p className="text-xs text-gray-500 px-1">
            Las ventas anuladas no se cuentan. El «día equivalente» del período anterior es el que está en la misma posición dentro del rango.
          </p>
        </>
      )}
    </PaginaReporte>
  );
}
