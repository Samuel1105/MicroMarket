"use client";

import { Chip } from "@heroui/react";
import React, { useMemo, useState } from "react";

import { getVentasDatos } from "@/actions/reportes/datos-reportes";
import ChartPanel from "@/components/reports/kit/ChartPanel";
import FilterBar, { FilterDim, Filters } from "@/components/reports/kit/FilterBar";
import KpiAnimado from "@/components/reports/kit/KpiAnimado";
import PaginaReporte from "@/components/reports/kit/PaginaReporte";
import Segmented from "@/components/reports/kit/Segmented";
import TablaBuscable, { Columna } from "@/components/reports/kit/TablaBuscable";
import { mapaColores } from "@/components/reports/kit/colores";
import { crearCubos, DIAS_SEMANA, diaSemanaDe, fechaEs, horaDe } from "@/components/reports/kit/fechas";
import { opcionBarrasH, opcionCalor, opcionColumnas, tablaDeSeries } from "@/components/reports/kit/opciones";
import { useReporte } from "@/components/reports/kit/useReporte";
import { aVentas, expandir, filtrarVentas } from "@/components/reports/kit/ventas";
import { ReportRange } from "@/components/reports/ReportHeader";
import { getCurrentMonthRange } from "@/src/utils/report-dates";
import { bs, num, pct, variacion } from "@/src/utils/report-format";

type Fila = {
  id: number;
  nombre: string;
  rol: string;
  importe: number;
  ventas: number;
  ticket: number;
  descuento: number;
  descuentoPct: number;
  parte: number;
  dias: number;
  mejorDia: { dia: string; importe: number } | null;
  anterior: number;
  cambio: number | null;
};

export default function EmployeeSalesReport() {
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
  const colorDe = useMemo(() => mapaColores((data?.vendedores ?? []).map((v) => v.nombre)), [data]);
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

  const alternar = (clave: string, valor: string) =>
    setFiltros((f) => {
      const actual = f[clave] ?? [];
      const n = { ...f };
      const lista = actual.includes(valor) ? actual.filter((x) => x !== valor) : [...actual, valor];

      if (lista.length) n[clave] = lista;
      else delete n[clave];

      return n;
    });

  // ── Por vendedor ──
  const porVendedor = useMemo<Fila[]>(() => {
    if (!data) return [];
    const total = ventas.reduce((s, v) => s + v.importe, 0);
    const prev = new Map<number, number>();

    ventasPrev.forEach((v) => prev.set(v.vendedor.id, (prev.get(v.vendedor.id) ?? 0) + v.importe));

    return data.vendedores
      .map((vd) => {
        const mias = ventas.filter((v) => v.vendedor.id === vd.id);
        const importe = mias.reduce((s, v) => s + v.importe, 0);
        const descuento = mias.reduce((s, v) => s + v.descuento, 0);
        const dias = new Map<string, number>();

        mias.forEach((v) => dias.set(v.dia, (dias.get(v.dia) ?? 0) + v.importe));
        const mejor = Array.from(dias.entries()).sort((a, b) => b[1] - a[1])[0];
        const anterior = prev.get(vd.id) ?? 0;

        return {
          id: vd.id,
          nombre: vd.nombre,
          rol: vd.rol,
          importe,
          ventas: mias.length,
          ticket: mias.length ? importe / mias.length : 0,
          descuento,
          // descuento % = descuentos dados ÷ (vendido + descuentos) × 100 · ticket = vendido ÷ número de ventas
          descuentoPct: importe + descuento > 0 ? (descuento / (importe + descuento)) * 100 : 0,
          parte: total ? (importe / total) * 100 : 0,
          dias: dias.size,
          mejorDia: mejor ? { dia: mejor[0], importe: mejor[1] } : null,
          anterior,
          cambio: variacion(importe, anterior),
        };
      })
      .sort((a, b) => b.importe - a.importe);
  }, [data, ventas, ventasPrev]);

  const activos = porVendedor.filter((v) => v.ventas > 0);
  const totalImporte = ventas.reduce((s, v) => s + v.importe, 0);
  const totalPrev = ventasPrev.reduce((s, v) => s + v.importe, 0);
  const totalDesc = ventas.reduce((s, v) => s + v.descuento, 0);
  const idPorNombre = new Map(porVendedor.map((v) => [v.nombre, v.id]));
  const valorDe = (v: Fila) => (medida === "bs" ? v.importe : v.ventas);
  const ordenados = [...activos].sort((a, b) => valorDe(b) - valorDe(a));

  // ── Gráficos ──
  const opcionRanking = useMemo(
    () =>
      opcionBarrasH({
        nombres: ordenados.map((v) => v.nombre),
        series: [{ name: medida === "bs" ? "Vendido" : "Ventas", color: "#2a78d6", valores: ordenados.map(valorDe) }],
        colorPorBarra: ordenados.map((v) => colorDe(v.nombre)),
        fmt,
        seleccion: (filtros.vendedor ?? []).map((id) => porVendedor.find((x) => String(x.id) === id)?.nombre ?? ""),
        pie: (nombre) => {
          const v = porVendedor.find((x) => x.nombre === nombre);

          return v ? `${v.ventas} ventas · ticket ${bs(v.ticket, 0)} · ${pct(v.parte, 0)} del total` : undefined;
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ordenados.map((v) => `${v.id}:${v.importe}:${v.ventas}`).join("|"), medida, filtros.vendedor],
  );

  const seriesDia = useMemo(() => {
    if (!cubos) return [];

    return activos
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((vd) => {
        const d = cubos.claves.map(() => 0);

        for (const v of ventas) if (v.vendedor.id === vd.id) d[cubos.indice(v.dia)] += peso(v);

        return { name: vd.nombre, color: colorDe(vd.nombre), data: d };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cubos, ventas, medida]);

  const opcionDias = useMemo(
    () => (cubos ? opcionColumnas({ etiquetas: cubos.etiquetas, series: seriesDia, apilado: true, fmt }) : {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cubos, seriesDia, medida],
  );

  // Qué vende cada uno (por categoría)
  const categorias = useMemo(() => Array.from(new Set(fil.map((x) => x.producto.categoria))).sort((a, b) => a.localeCompare(b)), [fil]);
  const opcionQue = useMemo(
    () =>
      opcionBarrasH({
        nombres: ordenados.map((v) => v.nombre),
        series: categorias.map((c) => ({
          name: c,
          color: colorCat(c),
          valores: ordenados.map((v) => fil.filter((x) => x.vendedor.id === v.id && x.producto.categoria === c).reduce((s, x) => s + x.importe, 0)),
        })),
        fmt: (n) => bs(n, 0),
        etiqueta: (_n, t) => bs(t, 0),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ordenados.map((v) => v.id).join("|"), categorias.join("|"), fil],
  );

  // Cuándo vende (día de la semana × hora)
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

  const columnas: Columna<Fila>[] = [
    {
      clave: "nombre",
      titulo: "Vendedor",
      valor: (v) => v.nombre,
      celda: (v) => (
        <span className="flex items-center gap-2 flex-wrap">
          <i className="inline-block w-3 h-3 rounded-full" style={{ background: colorDe(v.nombre) }} />
          <span className="font-semibold">{v.nombre}</span>
          {v.rol && (
            <Chip color="secondary" size="sm" variant="flat">
              {v.rol}
            </Chip>
          )}
        </span>
      ),
    },
    { clave: "importe", titulo: "Vendido", alinear: "der", valor: (v) => v.importe, celda: (v) => <b>{bs(v.importe, 0)}</b> },
    { clave: "ventas", titulo: "Ventas", alinear: "der", valor: (v) => v.ventas },
    { clave: "ticket", titulo: "Ticket", alinear: "der", valor: (v) => v.ticket, celda: (v) => (v.ventas ? bs(v.ticket, 0) : "—") },
    { clave: "parte", titulo: "% del total", alinear: "der", valor: (v) => v.parte, celda: (v) => pct(v.parte, 0) },
    { clave: "desc", titulo: "Descuentos", alinear: "der", valor: (v) => v.descuentoPct, celda: (v) => (v.ventas ? `${bs(v.descuento, 0)} (${pct(v.descuentoPct)})` : "—") },
    { clave: "dias", titulo: "Días con ventas", alinear: "der", valor: (v) => v.dias },
    { clave: "mejor", titulo: "Mejor día", alinear: "der", valor: (v) => v.mejorDia?.importe ?? 0, celda: (v) => (v.mejorDia ? `${fechaEs(v.mejorDia.dia)} · ${bs(v.mejorDia.importe, 0)}` : "—") },
    {
      clave: "cambio",
      titulo: "vs anterior",
      alinear: "der",
      valor: (v) => v.cambio ?? -999,
      celda: (v) => (v.cambio === null ? "—" : <span className={v.cambio >= 0 ? "text-green-700 font-semibold" : "text-red-600 font-semibold"}>{`${v.cambio >= 0 ? "+" : ""}${v.cambio.toFixed(0)}%`}</span>),
    },
  ];

  const sinVentas = ventas.length === 0;

  return (
    <PaginaReporte
      cargando={loading}
      crumb="Ventas por empleado"
      error={error}
      listo={!!data && !!cubos}
      onRango={setRange}
      pregunta="¿Quién vende más, con qué ticket y a qué hora?"
      rango={range}
      roles={[1, 4]}
      titulo="Ventas por empleado"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiAnimado
              definition="Total vendido por todo el equipo en el período (sin ventas anuladas)."
              delta={variacion(totalImporte, totalPrev)}
              formato={(n) => bs(n, 0)}
              hint={`${num(ventas.length)} ventas`}
              icon="heroicons:banknotes"
              label="Vendido por el equipo"
              valor={totalImporte}
            />
            <KpiAnimado
              definition="Cantidad de ventas (tickets) registradas."
              delta={variacion(ventas.length, ventasPrev.length)}
              formato={(n) => num(Math.round(n))}
              hint={`${activos.length} ${activos.length === 1 ? "persona vendió" : "personas vendieron"}`}
              icon="heroicons:receipt-percent"
              label="Ventas"
              tone="secondary"
              valor={ventas.length}
            />
            <KpiAnimado
              definition="Lo que deja cada venta en promedio."
              formato={(n) => bs(n, 0)}
              hint="por venta"
              icon="heroicons:shopping-bag"
              label="Ticket promedio"
              tone="success"
              valor={ventas.length ? totalImporte / ventas.length : 0}
            />
            <KpiAnimado
              definition="Descuentos dados, como porcentaje de lo que se habría vendido sin descuento."
              formato={(n) => pct(n)}
              hint={`${bs(totalDesc, 0)} en descuentos`}
              icon="heroicons:tag"
              label="Descuento promedio"
              tone="neutral"
              valor={totalImporte + totalDesc > 0 ? (totalDesc / (totalImporte + totalDesc)) * 100 : 0}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartPanel
              empty={sinVentas}
              height={Math.max(260, ordenados.length * 52 + 40)}
              option={opcionRanking}
              question="¿Quién vende más? Haz clic en una barra para ver solo a esa persona."
              stale={loading}
              table={{
                head: ["Vendedor", "Vendido", "Ventas", "Ticket"],
                rows: ordenados.map((v) => [v.nombre, bs(v.importe, 0), v.ventas, bs(v.ticket, 0)]),
              }}
              title="Ranking de vendedores"
              onClick={(p) => {
                const id = idPorNombre.get(String(p.name));

                if (id !== undefined) alternar("vendedor", String(id));
              }}
            />
            <ChartPanel
              empty={sinVentas}
              height={Math.max(260, ordenados.length * 52 + 40)}
              option={opcionQue}
              question="¿Qué vende cada uno? Cada color es una categoría de productos."
              stale={loading}
              title="Qué vende cada uno"
            />
          </div>

          <ChartPanel
            empty={sinVentas}
            height={320}
            option={opcionDias}
            question={`¿Cómo se reparte el trabajo ${cubos.porSemana ? "semana a semana" : "día a día"}? Haz clic en un nombre de la leyenda para ocultarlo.`}
            stale={loading}
            table={tablaDeSeries(cubos.porSemana ? "Semana" : "Día", cubos.etiquetas, seriesDia, (n) => (medida === "bs" ? bs(n, 0) : num(n)))}
            title={cubos.porSemana ? "Ventas por semana" : "Ventas por día"}
          />

          <ChartPanel
            empty={sinVentas}
            height={360}
            option={opcionHora}
            question="¿En qué días y a qué hora se vende más? Cuanto más oscuro, más ventas."
            stale={loading}
            title="¿Cuándo se vende más?"
          />

          <TablaBuscable
            clave={(v) => String(v.id)}
            columnas={columnas}
            filas={porVendedor}
            orden={{ clave: "importe", desc: true }}
            subtitulo={`Comparado con los ${data.rango.dias} días anteriores. Incluye a quienes no vendieron.`}
            titulo="Detalle por vendedor"
            buscar={(v) => `${v.nombre} ${v.rol}`}
          />
          {data.recortado && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              Hay muchísimas ventas en este rango y se muestran las más recientes. Acorta el rango de fechas para ver todo.
            </p>
          )}
        </>
      )}
    </PaginaReporte>
  );
}
