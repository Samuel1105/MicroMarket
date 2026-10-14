"use client";

import { Chip } from "@heroui/react";
import React, { useMemo, useState } from "react";

import { getCatalogoClientes, getVentasDatos } from "@/actions/reportes/datos-reportes";
import ChartPanel from "@/components/reports/kit/ChartPanel";
import FilterBar, { FilterDim, Filters } from "@/components/reports/kit/FilterBar";
import Kpi from "@/components/reports/Kpi";
import KpiAnimado from "@/components/reports/kit/KpiAnimado";
import PaginaReporte from "@/components/reports/kit/PaginaReporte";
import Segmented from "@/components/reports/kit/Segmented";
import TablaBuscable, { Columna } from "@/components/reports/kit/TablaBuscable";
import { mapaColores } from "@/components/reports/kit/colores";
import { crearCubos, fechaEs } from "@/components/reports/kit/fechas";
import { opcionBarrasH, opcionColumnas, opcionDona, tablaDeSeries } from "@/components/reports/kit/opciones";
import { useReporte } from "@/components/reports/kit/useReporte";
import { agrupar, expandir, filtrarVentas } from "@/components/reports/kit/ventas";
import { ReportRange } from "@/components/reports/ReportHeader";
import { getCurrentMonthRange } from "@/src/utils/report-dates";
import { bs, num, pct, variacion } from "@/src/utils/report-format";

type Prod = {
  nombre: string;
  categoria: string;
  unidad: string;
  importe: number;
  unidades: number;
  veces: number;
  parte: number;
  clase: "A" | "B" | "C";
  anterior: number;
  cambio: number | null;
};

const cant = (n: number) => num(n, n % 1 ? 1 : 0);

export default function SalesByProductReport() {
  const [range, setRange] = useState<ReportRange>(getCurrentMonthRange());
  const ventasQ = useReporte(getVentasDatos, range);
  const catalogoQ = useReporte(getCatalogoClientes, range);
  const data = ventasQ.data;
  const loading = ventasQ.loading || catalogoQ.loading;
  const [filtros, setFiltros] = useState<Filters>({});
  const [medida, setMedida] = useState<"bs" | "veces">("bs");
  const [topN, setTopN] = useState<10 | 20>(10);

  const { filas, previas } = useMemo(() => (data ? expandir(data) : { filas: [], previas: [] }), [data]);
  const fil = useMemo(() => filtrarVentas(filas, filtros), [filas, filtros]);
  const filPrev = useMemo(() => filtrarVentas(previas, filtros), [previas, filtros]);
  const cubos = useMemo(() => (data ? crearCubos(data.rango.start, data.rango.end) : null), [data]);
  const colorCat = useMemo(() => mapaColores((data?.productos ?? []).map((p) => p.categoria)), [data]);

  const fmt = (n: number) => (medida === "bs" ? bs(n, 0) : `${num(n)} ${n === 1 ? "vez" : "veces"}`);

  const dims = useMemo<FilterDim[]>(() => {
    const vend = new Map((data?.vendedores ?? []).map((v) => [String(v.id), v.nombre]));
    const cli = new Map((data?.clientes ?? []).map((c) => [String(c.id), c.nombre]));

    return [
      { key: "categoria", label: "Categoría", icon: "heroicons:tag", options: Array.from(new Set((data?.productos ?? []).map((p) => p.categoria))).sort((a, b) => a.localeCompare(b)) },
      { key: "producto", label: "Producto", icon: "heroicons:cube", options: Array.from(new Set((data?.productos ?? []).map((p) => p.nombre))).sort((a, b) => a.localeCompare(b)) },
      { key: "vendedor", label: "Vendedor", icon: "heroicons:user", options: Array.from(vend.keys()), show: (v) => vend.get(v) ?? v },
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

  // ── Por producto ──
  const productos = useMemo<Prod[]>(() => {
    const act = agrupar(fil, (x) => x.producto.nombre);
    const ant = agrupar(filPrev, (x) => x.producto.nombre);
    const total = Array.from(act.values()).reduce((s, a) => s + a.importe, 0);
    let acumulado = 0;

    return Array.from(act.entries())
      .sort((a, b) => b[1].importe - a[1].importe)
      .map(([nombre, a]) => {
        const p = a.filas[0].producto;
        const antes = ant.get(nombre)?.importe ?? 0;
        const antesAcum = acumulado;

        acumulado += a.importe;

        return {
          nombre,
          categoria: p.categoria,
          unidad: p.unidad,
          importe: a.importe,
          unidades: a.unidades,
          veces: a.ventas.size,
          parte: total ? (a.importe / total) * 100 : 0,
          // Importancia (Pareto): se ordena de más a menos vendido y se acumula el % del total.
          // A "Principal" = antes de llegar al 80 % · B "Media" = hasta el 95 % · C "Poca" = el resto
          clase: (total && antesAcum / total < 0.8 ? "A" : total && antesAcum / total < 0.95 ? "B" : "C") as "A" | "B" | "C",
          anterior: antes,
          cambio: variacion(a.importe, antes),
        };
      });
  }, [fil, filPrev]);

  const total = productos.reduce((s, p) => s + p.importe, 0);
  const totalPrev = filPrev.reduce((s, x) => s + x.importe, 0);
  const claseA = productos.filter((p) => p.clase === "A").length;
  const valorDe = (p: Prod) => (medida === "bs" ? p.importe : p.veces);
  const top = useMemo(() => [...productos].sort((a, b) => valorDe(b) - valorDe(a)).slice(0, topN), [productos, medida, topN]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Gráficos ──
  const opcionTop = useMemo(
    () =>
      opcionBarrasH({
        nombres: top.map((p) => p.nombre),
        series: [{ name: medida === "bs" ? "Vendido" : "Veces vendido", color: "#2a78d6", valores: top.map(valorDe) }],
        colorPorBarra: top.map((p) => colorCat(p.categoria)),
        fmt,
        seleccion: filtros.producto ?? [],
        pie: (nombre) => {
          const p = productos.find((x) => x.nombre === nombre);

          return p ? `${p.categoria} · ${cant(p.unidades)} ${p.unidad} · ${pct(p.parte, 1)} del total` : undefined;
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [top, medida, filtros.producto, colorCat],
  );

  const porCategoria = useMemo(() => {
    const m = agrupar(fil, (x) => x.producto.categoria);

    return Array.from(m.entries())
      .map(([nombre, a]) => ({ nombre, valor: medida === "bs" ? a.importe : a.ventas.size }))
      .sort((a, b) => b.valor - a.valor);
  }, [fil, medida]);
  const totalCat = porCategoria.reduce((s, c) => s + c.valor, 0);

  const opcionCat = useMemo(
    () =>
      opcionDona({
        datos: porCategoria.map((c) => ({ name: c.nombre, value: c.valor, color: colorCat(c.nombre) })),
        centro: { texto: medida === "bs" ? bs(totalCat, 0) : num(totalCat), sub: medida === "bs" ? "vendido" : "ventas" },
        fmt,
        seleccion: filtros.categoria ?? [],
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [porCategoria, filtros.categoria, medida],
  );

  const seriesDia = useMemo(() => {
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

  const opcionDias = useMemo(
    () => (cubos ? opcionColumnas({ etiquetas: cubos.etiquetas, series: seriesDia, apilado: true, fmt }) : {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cubos, seriesDia, medida],
  );

  // Qué sube y qué baja frente al período anterior
  const cambios = useMemo(
    () =>
      productos
        .map((p) => ({ nombre: p.nombre, dif: p.importe - p.anterior }))
        .filter((x) => Math.abs(x.dif) > 0.5)
        .sort((a, b) => Math.abs(b.dif) - Math.abs(a.dif))
        .slice(0, 10)
        .sort((a, b) => b.dif - a.dif),
    [productos],
  );
  const opcionCambios = useMemo(
    () =>
      opcionBarrasH({
        nombres: cambios.map((c) => c.nombre),
        series: [{ name: "Cambio", color: "#1baf7a", valores: cambios.map((c) => c.dif) }],
        fmt: (n) => `${n > 0 ? "+" : ""}${bs(n, 0)}`,
        negativoRojo: true,
        seleccion: filtros.producto ?? [],
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cambios, filtros.producto],
  );

  // Productos que no se vendieron (respeta categoría/producto, no vendedor/cliente)
  const sinVentas = useMemo(() => {
    const cat = catalogoQ.data?.catalogo ?? [];
    const vendidos = new Set(filas.map((x) => x.producto.nombre));

    return cat.filter(
      (p) =>
        !vendidos.has(p.nombre) &&
        (!filtros.categoria?.length || filtros.categoria.includes(p.categoria)) &&
        (!filtros.producto?.length || filtros.producto.includes(p.nombre)),
    );
  }, [catalogoQ.data, filas, filtros.categoria, filtros.producto]);

  const columnas: Columna<Prod>[] = [
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
    { clave: "importe", titulo: "Vendido", alinear: "der", valor: (p) => p.importe, celda: (p) => <b>{bs(p.importe, 0)}</b> },
    { clave: "unidades", titulo: "Cantidad", alinear: "der", valor: (p) => p.unidades, celda: (p) => `${cant(p.unidades)} ${p.unidad}` },
    { clave: "veces", titulo: "Veces", alinear: "der", valor: (p) => p.veces },
    { clave: "parte", titulo: "% del total", alinear: "der", valor: (p) => p.parte, celda: (p) => pct(p.parte, 1) },
    {
      clave: "clase",
      titulo: "Importancia",
      valor: (p) => p.clase,
      celda: (p) => (
        <Chip color={p.clase === "A" ? "success" : p.clase === "B" ? "warning" : "default"} size="sm" variant="flat">
          {p.clase === "A" ? "Principal" : p.clase === "B" ? "Media" : "Poca"}
        </Chip>
      ),
    },
    {
      clave: "cambio",
      titulo: "vs anterior",
      alinear: "der",
      valor: (p) => p.cambio ?? -999,
      celda: (p) => (p.cambio === null ? <span className="text-gray-400">nuevo</span> : <span className={p.cambio >= 0 ? "text-green-700 font-semibold" : "text-red-600 font-semibold"}>{`${p.cambio >= 0 ? "+" : ""}${p.cambio.toFixed(0)}%`}</span>),
    },
  ];

  return (
    <PaginaReporte
      cargando={loading}
      crumb="Ventas por producto"
      error={ventasQ.error ?? catalogoQ.error}
      listo={!!data && !!cubos}
      onRango={setRange}
      pregunta="¿Qué se vende más, qué sube, qué baja y qué no se mueve?"
      rango={range}
      roles={[1, 4]}
      titulo="Ventas por producto"
    >
      {data && cubos && (
        <>
          <FilterBar dims={dims} value={filtros} onChange={setFiltros}>
            <span className="text-xs text-gray-500 hidden sm:inline">Medir en</span>
            <Segmented
              label="Medir en"
              options={[
                { value: "bs", label: "Bolivianos" },
                { value: "veces", label: "Veces vendido" },
              ]}
              value={medida}
              onChange={setMedida}
            />
          </FilterBar>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiAnimado
              definition="Total vendido de los productos elegidos (sin ventas anuladas)."
              delta={variacion(total, totalPrev)}
              formato={(n) => bs(n, 0)}
              hint="en el período"
              icon="heroicons:banknotes"
              label="Vendido"
              valor={total}
            />
            <KpiAnimado
              definition="Productos que se vendieron al menos una vez."
              formato={(n) => String(Math.round(n))}
              hint={`de ${data.productos.length} que se vendieron en total · catálogo de ${catalogoQ.data?.catalogo.length ?? "…"}`}
              icon="heroicons:cube"
              label="Productos vendidos"
              tone="secondary"
              valor={productos.length}
            />
            <Kpi
              definition="El producto que más dinero dejó con estos filtros."
              hint={productos[0] ? `${bs(productos[0].importe, 0)} · ${pct(productos[0].parte, 0)} del total` : "Sin ventas"}
              icon="heroicons:trophy"
              label="Producto estrella"
              tone="success"
              value={productos[0]?.nombre ?? "—"}
            />
            <KpiAnimado
              definition="Cuántos productos juntos hacen el 80% de lo que vendes. Los demás aportan poco."
              formato={(n) => `${Math.round(n)} ${Math.round(n) === 1 ? "producto" : "productos"}`}
              hint="hacen el 80% de las ventas"
              icon="heroicons:chart-pie"
              label="El 80% sale de"
              tone="neutral"
              valor={claseA}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <ChartPanel
              className="xl:col-span-2"
              empty={productos.length === 0}
              height={Math.max(300, top.length * 36 + 40)}
              option={opcionTop}
              question="¿Qué productos se venden más? El color es su categoría. Haz clic en una barra para ver solo ese producto."
              stale={loading}
              table={{
                head: ["Producto", "Categoría", "Vendido", "Veces"],
                rows: top.map((p) => [p.nombre, p.categoria, bs(p.importe, 0), p.veces]),
              }}
              title="Los más vendidos"
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
              empty={porCategoria.length === 0}
              height={Math.max(300, top.length * 36 + 40)}
              option={opcionCat}
              question="¿Qué categoría pesa más? Haz clic en un color para filtrar."
              stale={loading}
              table={{
                head: ["Categoría", medida === "bs" ? "Vendido" : "Veces", "Parte"],
                rows: porCategoria.map((c) => [c.nombre, medida === "bs" ? bs(c.valor, 0) : c.valor, totalCat ? pct((c.valor / totalCat) * 100, 0) : "0%"]),
              }}
              title="Por categoría"
              onClick={(p) => alternar("categoria", String(p.name))}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <ChartPanel
              empty={productos.length === 0}
              height={320}
              option={opcionDias}
              question={`¿Cuánto se vende ${cubos.porSemana ? "cada semana" : "cada día"}, por categoría?`}
              stale={loading}
              table={tablaDeSeries(cubos.porSemana ? "Semana" : "Día", cubos.etiquetas, seriesDia, (n) => (medida === "bs" ? bs(n, 0) : num(n)))}
              title={cubos.porSemana ? "Ventas por semana" : "Ventas por día"}
            />
            <ChartPanel
              empty={cambios.length === 0 || totalPrev === 0}
              emptyText="No hay ventas en el período anterior para comparar."
              height={320}
              option={opcionCambios}
              question="¿Qué productos suben y cuáles bajan frente al período anterior (en bolivianos)?"
              stale={loading}
              table={{ head: ["Producto", "Cambio"], rows: cambios.map((c) => [c.nombre, `${c.dif > 0 ? "+" : ""}${bs(c.dif, 0)}`]) }}
              title="Qué sube y qué baja"
              onClick={(p) => alternar("producto", String(p.name))}
            />
          </div>

          <TablaBuscable
            clave={(p) => p.nombre}
            columnas={columnas}
            filas={productos}
            orden={{ clave: "importe", desc: true }}
            porPagina={12}
            subtitulo="«Importancia»: Principal = los que más aportan a tus ventas; Media = aportan algo; Poca = casi no aportan."
            titulo="Detalle de productos"
            buscar={(p) => `${p.nombre} ${p.categoria}`}
          />

          {sinVentas.length > 0 && (
            <TablaBuscable
              clave={(p) => p.nombre}
              columnas={[
                { clave: "nombre", titulo: "Producto", valor: (p) => p.nombre, celda: (p) => <span className="font-semibold">{p.nombre}</span> },
                { clave: "categoria", titulo: "Categoría", valor: (p) => p.categoria },
                { clave: "ultima", titulo: "Última venta", alinear: "der", valor: (p) => p.ultimaVenta ?? "", celda: (p) => (p.ultimaVenta ? fechaEs(p.ultimaVenta) : "Nunca se vendió") },
              ]}
              filas={sinVentas}
              porPagina={8}
              subtitulo="Productos del catálogo que no se vendieron en el período. Pregúntate si conviene seguir comprándolos."
              titulo="Productos que no se vendieron"
              buscar={(p) => `${p.nombre} ${p.categoria}`}
            />
          )}
        </>
      )}
    </PaginaReporte>
  );
}

