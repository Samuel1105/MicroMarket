"use client";

import React, { useMemo, useState } from "react";

import { FilaCompra, getFinanzasDatos, getVentasDatos } from "@/actions/reportes/datos-reportes";
import Avisos, { Aviso } from "@/components/reports/kit/Avisos";
import ChartPanel from "@/components/reports/kit/ChartPanel";
import FilterBar, { FilterDim, Filters } from "@/components/reports/kit/FilterBar";
import KpiAnimado from "@/components/reports/kit/KpiAnimado";
import PaginaReporte from "@/components/reports/kit/PaginaReporte";
import TablaBuscable, { Columna } from "@/components/reports/kit/TablaBuscable";
import { mapaColores } from "@/components/reports/kit/colores";
import { crearCubos, diaDeSegundos, fechaEs } from "@/components/reports/kit/fechas";
import { opcionBarrasH, opcionColumnas, opcionDona, tablaDeSeries } from "@/components/reports/kit/opciones";
import { useReporte } from "@/components/reports/kit/useReporte";
import { agrupar, expandir, filtrarVentas } from "@/components/reports/kit/ventas";
import { ReportRange } from "@/components/reports/ReportHeader";
import { getCurrentMonthRange } from "@/src/utils/report-dates";
import { bs, num, pct, variacion } from "@/src/utils/report-format";

type Cat = { categoria: string; vendido: number; costo: number; ganancia: number; margen: number; compras: number; perdida: number; utilidad: number };

export default function FinancialReport() {
  const [range, setRange] = useState<ReportRange>(getCurrentMonthRange());
  const ventasQ = useReporte(getVentasDatos, range);
  const finQ = useReporte(getFinanzasDatos, range);
  const data = ventasQ.data;
  const fin = finQ.data;
  const loading = ventasQ.loading || finQ.loading;
  const [filtros, setFiltros] = useState<Filters>({});

  const { filas, previas } = useMemo(() => (data ? expandir(data) : { filas: [], previas: [] }), [data]);
  const fil = useMemo(() => filtrarVentas(filas, filtros), [filas, filtros]);
  const filPrev = useMemo(() => filtrarVentas(previas, filtros), [previas, filtros]);
  const cubos = useMemo(() => (data ? crearCubos(data.rango.start, data.rango.end) : null), [data]);
  const colorCat = useMemo(() => mapaColores((data?.productos ?? []).map((p) => p.categoria)), [data]);

  const pasa = (producto: string, categoria: string) =>
    (!filtros.producto?.length || filtros.producto.includes(producto)) && (!filtros.categoria?.length || filtros.categoria.includes(categoria));
  const compras = useMemo(() => (fin?.compras ?? []).filter((c) => pasa(c.producto, c.categoria)), [fin, filtros]); // eslint-disable-line react-hooks/exhaustive-deps
  const comprasPrev = useMemo(() => (fin?.comprasPrev ?? []).filter((c) => pasa(c.producto, c.categoria)), [fin, filtros]); // eslint-disable-line react-hooks/exhaustive-deps
  const vencidos = useMemo(() => (fin?.vencidos ?? []).filter((v) => pasa(v.producto, v.categoria)), [fin, filtros]); // eslint-disable-line react-hooks/exhaustive-deps
  const vencidosPrev = useMemo(() => (fin?.vencidosPrev ?? []).filter((v) => pasa(v.producto, v.categoria)), [fin, filtros]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Totales ──
  const suma = (rows: { importe: number }[]) => rows.reduce((s, x) => s + x.importe, 0);
  const vendido = suma(fil);
  const costo = fil.reduce((s, x) => s + x.costo, 0);
  // FÓRMULAS (solo para el autor, no se muestran en pantalla):
  //   vendido  = suma de las ventas vigentes (las anuladas no cuentan)
  //   costo    = unidades vendidas × costo promedio ponderado de compra (por unidad base)
  //   ganancia = vendido − costo                       (ganancia bruta)
  //   perdida  = costo de los lotes que vencieron con unidades sin vender dentro del período
  //   utilidad = ganancia − perdida                    · margen = utilidad ÷ vendido × 100
  //   compraste = suma de las compras recibidas        · caja neta = vendido − compraste (no es utilidad)
  //   Cuadre: compraste = costo de lo vendido + lo que queda en el almacén (al costo) + mermas y vencidos dados de baja
  const ganancia = vendido - costo;
  const perdida = vencidos.reduce((s, v) => s + v.costo, 0);
  const utilidad = ganancia - perdida;
  const totalCompras = compras.reduce((s, c) => s + c.total, 0);
  const vendidoPrev = suma(filPrev);
  const costoPrev = filPrev.reduce((s, x) => s + x.costo, 0);
  const perdidaPrev = vencidosPrev.reduce((s, v) => s + v.costo, 0);
  const utilidadPrev = vendidoPrev - costoPrev - perdidaPrev;
  const totalComprasPrev = comprasPrev.reduce((s, c) => s + c.total, 0);

  // ── Por día / semana ──
  const series = useMemo(() => {
    if (!cubos) return null;
    const v = cubos.claves.map(() => 0);
    const c = cubos.claves.map(() => 0);
    const g = cubos.claves.map(() => 0);

    for (const x of fil) {
      const i = cubos.indice(x.dia);

      v[i] += x.importe;
      g[i] += x.importe - x.costo;
    }
    for (const x of compras) c[cubos.indice(diaDeSegundos(x.f))] += x.total;

    return { v, c, g };
  }, [cubos, fil, compras]);

  const opcionTiempo = useMemo(
    () =>
      cubos && series
        ? opcionColumnas({
            etiquetas: cubos.etiquetas,
            series: [
              { name: "Vendido", color: "#2a78d6", data: series.v },
              { name: "Compras", color: "#eb6834", data: series.c },
            ],
            superpuesta: { name: "Ganancia bruta", color: "#1baf7a", data: series.g },
            fmt: (n) => bs(n, 0),
          })
        : {},
    [cubos, series],
  );

  // ── De cada 100 Bs ──
  const opcion100 = useMemo(
    () =>
      vendido > 0
        ? opcionBarrasH({
            nombres: ["De cada Bs 100 que vendes"],
            series: [
              { name: "Costó la mercadería", color: "#eb6834", valores: [(costo / vendido) * 100] },
              { name: "Se perdió por vencimiento", color: "#6250d6", valores: [Math.max((perdida / vendido) * 100, 0)] },
              { name: "Te queda de utilidad", color: "#1baf7a", valores: [Math.max((utilidad / vendido) * 100, 0)] },
            ],
            fmt: (n) => bs(n, 1),
            etiqueta: () => "Bs 100",
            maximo: 100,
          })
        : {},
    [vendido, costo, perdida, utilidad],
  );

  // ── Por categoría ──
  const categorias = useMemo<Cat[]>(() => {
    const v = agrupar(fil, (x) => x.producto.categoria);
    const nombres = new Set<string>([...v.keys(), ...compras.map((c) => c.categoria), ...vencidos.map((x) => x.categoria)]);

    return Array.from(nombres)
      .map((categoria) => {
        const a = v.get(categoria);
        const vendidoC = a?.importe ?? 0;
        const costoC = a?.costo ?? 0;
        const comprasC = compras.filter((c) => c.categoria === categoria).reduce((s, c) => s + c.total, 0);
        const perdidaC = vencidos.filter((x) => x.categoria === categoria).reduce((s, x) => s + x.costo, 0);

        return {
          categoria,
          vendido: vendidoC,
          costo: costoC,
          ganancia: vendidoC - costoC,
          margen: vendidoC > 0 ? ((vendidoC - costoC - perdidaC) / vendidoC) * 100 : 0,
          compras: comprasC,
          perdida: perdidaC,
          utilidad: vendidoC - costoC - perdidaC,
        };
      })
      .sort((a, b) => b.vendido - a.vendido);
  }, [fil, compras, vencidos]);

  const opcionVentasCat = useMemo(
    () =>
      opcionDona({
        datos: categorias.map((c) => ({ name: c.categoria, value: c.vendido, color: colorCat(c.categoria) })),
        centro: { texto: bs(vendido, 0), sub: "vendido" },
        fmt: (n) => bs(n, 0),
        seleccion: filtros.categoria ?? [],
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categorias, filtros.categoria],
  );

  const porUtilidad = useMemo(() => [...categorias].sort((a, b) => b.utilidad - a.utilidad), [categorias]);
  const opcionUtilidadCat = useMemo(
    () =>
      opcionBarrasH({
        nombres: porUtilidad.map((c) => c.categoria),
        series: [{ name: "Utilidad", color: "#1baf7a", valores: porUtilidad.map((c) => c.utilidad) }],
        colorPorBarra: porUtilidad.map((c) => colorCat(c.categoria)),
        negativoRojo: true,
        fmt: (n) => bs(n, 0),
        seleccion: filtros.categoria ?? [],
        pie: (nombre) => {
          const c = porUtilidad.find((x) => x.categoria === nombre);

          return c ? `Vendido ${bs(c.vendido, 0)} · margen ${pct(c.margen, 1)}` : undefined;
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [porUtilidad, filtros.categoria],
  );

  // ── Compras por proveedor ──
  const porProveedor = useMemo(() => {
    const m = new Map<string, number>();

    compras.forEach((c: FilaCompra) => m.set(c.proveedor, (m.get(c.proveedor) ?? 0) + c.total));

    return Array.from(m.entries())
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total);
  }, [compras]);
  const colorProv = useMemo(() => mapaColores(porProveedor.map((p) => p.nombre)), [porProveedor]);
  const opcionProv = useMemo(
    () =>
      opcionBarrasH({
        nombres: porProveedor.map((p) => p.nombre),
        series: [{ name: "Compras", color: "#eb6834", valores: porProveedor.map((p) => p.total) }],
        colorPorBarra: porProveedor.map((p) => colorProv(p.nombre)),
        fmt: (n) => bs(n, 0),
        pie: (nombre) => {
          const p = porProveedor.find((x) => x.nombre === nombre);

          return p && totalCompras ? `${pct((p.total / totalCompras) * 100, 0)} de tus compras` : undefined;
        },
      }),
    [porProveedor, colorProv, totalCompras],
  );

  const avisos: Aviso[] = [];

  if (data?.avisos.sinCosto.length)
    avisos.push({ tono: "alerta", texto: `Sin compras registradas (costo 0): ${data.avisos.sinCosto.join(", ")}. Su ganancia sale inflada.` });
  if (data?.avisos.vendidosDeMas.length)
    avisos.push({ tono: "alerta", texto: `Se vendió más de lo que se compró: ${data.avisos.vendidosDeMas.join(", ")}. Revisa que las compras estén completas.` });

  const columnas: Columna<Cat>[] = [
    {
      clave: "categoria",
      titulo: "Categoría",
      valor: (c) => c.categoria,
      celda: (c) => (
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <i className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: colorCat(c.categoria) }} />
          {c.categoria}
        </span>
      ),
    },
    { clave: "vendido", titulo: "Vendido", alinear: "der", valor: (c) => c.vendido, celda: (c) => bs(c.vendido, 0) },
    { clave: "costo", titulo: "Costó", alinear: "der", valor: (c) => c.costo, celda: (c) => bs(c.costo, 0) },
    { clave: "ganancia", titulo: "Ganancia bruta", alinear: "der", valor: (c) => c.ganancia, celda: (c) => bs(c.ganancia, 0) },
    { clave: "perdida", titulo: "Vencido", alinear: "der", valor: (c) => c.perdida, celda: (c) => (c.perdida ? <span className="text-red-600">{bs(c.perdida, 0)}</span> : "—") },
    { clave: "utilidad", titulo: "Utilidad", alinear: "der", valor: (c) => c.utilidad, celda: (c) => <b className={c.utilidad < 0 ? "text-red-600" : ""}>{bs(c.utilidad, 0)}</b> },
    { clave: "margen", titulo: "Margen", alinear: "der", valor: (c) => c.margen, celda: (c) => (c.vendido ? pct(c.margen, 1) : "—") },
    { clave: "compras", titulo: "Compraste", alinear: "der", valor: (c) => c.compras, celda: (c) => bs(c.compras, 0) },
  ];

  const sinVentas = vendido === 0 && totalCompras === 0;

  return (
    <PaginaReporte
      cargando={loading}
      crumb="Estado financiero"
      error={ventasQ.error ?? finQ.error}
      listo={!!data && !!fin && !!cubos}
      onRango={setRange}
      pregunta="¿Ganamos o perdemos? ¿Cuánto entra, cuánto sale y cuánto queda?"
      rango={range}
      roles={[1, 4]}
      titulo="Estado financiero"
    >
      {data && fin && cubos && (
        <>
          <FilterBar dims={dims} value={filtros} onChange={setFiltros} />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <KpiAnimado
              definition="Total vendido (sin ventas anuladas)."
              delta={variacion(vendido, vendidoPrev)}
              formato={(n) => bs(n, 0)}
              hint={`${num(new Set(fil.map((x) => x.venta)).size)} ventas`}
              icon="heroicons:banknotes"
              label="Vendiste"
              valor={vendido}
            />
            <KpiAnimado
              definition="Lo que costó (a precio de compra) la mercadería que vendiste."
              formato={(n) => bs(n, 0)}
              hint="costo de lo vendido"
              icon="heroicons:receipt-percent"
              label="Costó lo que vendiste"
              tone="secondary"
              valor={costo}
            />
            <KpiAnimado
              definition="Vendido menos lo que costó la mercadería, antes de contar lo que se venció y los gastos del local."
              formato={(n) => bs(n, 0)}
              hint={`margen bruto ${vendido ? pct((ganancia / vendido) * 100, 1) : "0%"}`}
              icon="heroicons:arrow-trending-up"
              label="Ganancia bruta"
              tone="success"
              valor={ganancia}
            />
            <KpiAnimado
              definition="Costo de la mercadería que venció sin venderse dentro del período."
              formato={(n) => bs(n, 0)}
              hint={vencidos.length ? `${vencidos.length} ${vencidos.length === 1 ? "lote vencido" : "lotes vencidos"}` : "nada se venció"}
              icon="heroicons:clock"
              label="Perdido por vencimiento"
              tone={perdida > 0 ? "danger" : "success"}
              valor={perdida}
            />
            <KpiAnimado
              definition="Ganancia bruta menos lo perdido por vencimiento. Es antes de alquiler, sueldos y otros gastos del local."
              delta={variacion(utilidad, utilidadPrev)}
              formato={(n) => bs(n, 0)}
              hint={`margen ${vendido ? pct((utilidad / vendido) * 100, 1) : "0%"}`}
              icon="heroicons:chart-bar"
              label="Utilidad"
              tone={utilidad < 0 ? "danger" : "primary"}
              valor={utilidad}
            />
            <KpiAnimado
              definition="Lo que compraste a tus proveedores en el período. Parte de eso sigue guardado en el almacén, por eso no es una pérdida."
              delta={variacion(totalCompras, totalComprasPrev)}
              formato={(n) => bs(n, 0)}
              hint={`caja neta ${bs(vendido - totalCompras, 0)}`}
              icon="heroicons:truck"
              label="Compraste"
              tone="neutral"
              valor={totalCompras}
            />
          </div>

          <Avisos items={avisos} />

          <ChartPanel
            empty={vendido <= 0}
            height={150}
            option={opcion100}
            question="De cada 100 bolivianos que vendes: cuánto es costo, cuánto se perdió por vencimiento y cuánto te queda."
            stale={loading}
            title="¿A dónde va tu plata?"
          />

          <ChartPanel
            empty={sinVentas}
            height={340}
            option={opcionTiempo}
            question={`¿Cuánto entra y cuánto sale ${cubos.porSemana ? "cada semana" : "cada día"}? La línea es la ganancia bruta.`}
            stale={loading}
            table={
              series
                ? tablaDeSeries(
                    cubos.porSemana ? "Semana" : "Día",
                    cubos.etiquetas,
                    [
                      { name: "Vendido", color: "", data: series.v },
                      { name: "Compras", color: "", data: series.c },
                      { name: "Ganancia bruta", color: "", data: series.g },
                    ],
                    (n) => bs(n, 0),
                    false,
                  )
                : undefined
            }
            title={cubos.porSemana ? "Ventas y compras por semana" : "Ventas y compras por día"}
          />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <ChartPanel
              empty={categorias.length === 0}
              height={320}
              option={opcionVentasCat}
              question="¿Qué categoría vende más? Clic en un color para filtrar."
              stale={loading}
              table={{ head: ["Categoría", "Vendido"], rows: categorias.map((c) => [c.categoria, bs(c.vendido, 0)]) }}
              title="Ventas por categoría"
              onClick={(p) => alternar("categoria", String(p.name))}
            />
            <ChartPanel
              empty={porUtilidad.length === 0}
              height={320}
              option={opcionUtilidadCat}
              question="¿Qué categoría deja más utilidad? Clic en una barra para filtrar."
              stale={loading}
              table={{ head: ["Categoría", "Utilidad", "Margen"], rows: porUtilidad.map((c) => [c.categoria, bs(c.utilidad, 0), c.vendido ? pct(c.margen, 1) : "—"]) }}
              title="Utilidad por categoría"
              onClick={(p) => alternar("categoria", String(p.name))}
            />
            <ChartPanel
              empty={porProveedor.length === 0}
              emptyText="No hubo compras en este período."
              height={320}
              option={opcionProv}
              question="¿A quién le compras más?"
              stale={loading}
              table={{ head: ["Proveedor", "Compras", "Parte"], rows: porProveedor.map((p) => [p.nombre, bs(p.total, 0), totalCompras ? pct((p.total / totalCompras) * 100, 0) : "0%"]) }}
              title="Compras por proveedor"
            />
          </div>

          <TablaBuscable
            clave={(c) => c.categoria}
            columnas={columnas}
            filas={categorias}
            orden={{ clave: "vendido", desc: true }}
            porPagina={10}
            subtitulo="Resumen por categoría: cuánto vendiste, cuánto costó, lo que se venció y lo que te quedó."
            titulo="Cuentas por categoría"
            buscar={(c) => c.categoria}
          />

          {vencidos.length > 0 && (
            <TablaBuscable
              clave={(v) => `${v.producto}-${v.lote}`}
              columnas={[
                { clave: "producto", titulo: "Producto", valor: (v) => v.producto, celda: (v) => <span className="font-semibold">{v.producto}</span> },
                { clave: "lote", titulo: "Lote", valor: (v) => v.lote },
                { clave: "vencio", titulo: "Venció el", alinear: "der", valor: (v) => v.venciO, celda: (v) => fechaEs(v.venciO) },
                { clave: "unidades", titulo: "Sin vender", alinear: "der", valor: (v) => v.unidades, celda: (v) => num(v.unidades, v.unidades % 1 ? 1 : 0) },
                { clave: "costo", titulo: "Costo perdido", alinear: "der", valor: (v) => v.costo, celda: (v) => <b className="text-red-600">{bs(v.costo, 0)}</b> },
              ]}
              filas={vencidos}
              orden={{ clave: "costo", desc: true }}
              porPagina={6}
              subtitulo="Lotes que vencieron en el período con unidades sin vender. Para evitarlo: compra menos cantidad o rota primero lo que vence antes."
              titulo="Mercadería que se venció"
              buscar={(v) => `${v.producto} ${v.lote}`}
            />
          )}
          <p className="text-xs text-gray-500 px-1">
            La utilidad es antes de gastos del local (alquiler, sueldos, servicios).
          </p>
        </>
      )}
    </PaginaReporte>
  );
}
