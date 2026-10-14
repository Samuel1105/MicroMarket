"use client";
import { Input, Pagination } from "@heroui/react";
import { Icon } from "@iconify/react";
import React, { useEffect, useMemo, useState } from "react";

export type Columna<T> = {
  clave: string;
  titulo: string;
  alinear?: "izq" | "der";
  /** Valor para ordenar y para exportar */
  valor: (r: T) => string | number;
  /** Cómo se dibuja la celda (por defecto, el valor) */
  celda?: (r: T) => React.ReactNode;
};

type Props<T> = {
  titulo: string;
  subtitulo?: string;
  filas: T[];
  columnas: Columna<T>[];
  /** Texto en el que busca el buscador */
  buscar: (r: T) => string;
  clave: (r: T) => string;
  porPagina?: number;
  vacio?: string;
  /** Orden inicial */
  orden?: { clave: string; desc?: boolean };
  /** Resalta una fila (por ejemplo, un producto con problemas) */
  claseFila?: (r: T) => string;
  /** Contenido extra junto al título (botones, chips…) */
  extra?: React.ReactNode;
};

/** Tabla con buscador, orden por columna y paginación */
export default function TablaBuscable<T>({
  titulo,
  subtitulo,
  filas,
  columnas,
  buscar,
  clave,
  porPagina = 12,
  vacio = "No hay datos con estos filtros.",
  orden,
  claseFila,
  extra,
}: Props<T>) {
  const [q, setQ] = useState("");
  const [pagina, setPagina] = useState(1);
  const [ord, setOrd] = useState<{ clave: string; desc: boolean } | null>(orden ? { clave: orden.clave, desc: !!orden.desc } : null);

  useEffect(() => setPagina(1), [q, filas]);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = t ? filas.filter((r) => buscar(r).toLowerCase().includes(t)) : filas;

    if (!ord) return base;
    const col = columnas.find((c) => c.clave === ord.clave);

    if (!col) return base;

    return [...base].sort((a, b) => {
      const x = col.valor(a);
      const y = col.valor(b);
      const r = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "es");

      return ord.desc ? -r : r;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filas, q, ord]);

  const paginas = Math.max(Math.ceil(visibles.length / porPagina), 1);
  const pagActual = Math.min(pagina, paginas);
  const pagina_ = visibles.slice((pagActual - 1) * porPagina, pagActual * porPagina);

  const alternar = (clave_: string) => setOrd((o) => (o?.clave === clave_ ? { clave: clave_, desc: !o.desc } : { clave: clave_, desc: true }));

  return (
    <section className="rounded-2xl border border-default-200 bg-white shadow-sm p-4 sm:p-5 space-y-4 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-base">{titulo}</h3>
          {subtitulo && <p className="text-xs text-gray-500 mt-0.5">{subtitulo}</p>}
        </div>
        <div className="flex items-center gap-2">
          {extra}
        </div>
      </div>

      <Input
        isClearable
        placeholder="Buscar…"
        size="sm"
        startContent={<Icon height="16" icon="heroicons:magnifying-glass" width="16" />}
        value={q}
        onValueChange={setQ}
      />

      {visibles.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">{vacio}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-gray-400 border-b border-default-200">
                  {columnas.map((c) => (
                    <th key={c.clave} className={`py-2 pr-3 font-medium ${c.alinear === "der" ? "text-right" : "text-left"}`}>
                      <button
                        className={`inline-flex items-center gap-1 hover:text-gray-700 ${ord?.clave === c.clave ? "text-primary-700" : ""}`}
                        type="button"
                        onClick={() => alternar(c.clave)}
                      >
                        {c.titulo}
                        {ord?.clave === c.clave && (
                          <Icon height="12" icon={ord.desc ? "heroicons:chevron-down" : "heroicons:chevron-up"} width="12" />
                        )}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagina_.map((r) => (
                  <tr key={clave(r)} className={`border-b border-default-100 align-top hover:bg-default-50 ${claseFila?.(r) ?? ""}`}>
                    {columnas.map((c) => (
                      <td key={c.clave} className={`py-2.5 pr-3 ${c.alinear === "der" ? "text-right tabular-nums whitespace-nowrap" : ""}`}>
                        {c.celda ? c.celda(r) : c.valor(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              {visibles.length} {visibles.length === 1 ? "fila" : "filas"}
            </p>
            {paginas > 1 && <Pagination page={pagActual} size="sm" total={paginas} onChange={setPagina} />}
          </div>
        </>
      )}
    </section>
  );
}
