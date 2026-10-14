"use client";
import { Icon } from "@iconify/react";
import React, { useEffect, useMemo, useRef, useState } from "react";

export type FilterDim = {
  key: string;
  label: string;
  icon: string;
  options: string[];
  /** Cómo se muestra cada opción (por defecto, el mismo texto) */
  show?: (v: string) => string;
};

export type Filters = Record<string, string[]>;

const LIMITE = 150;
const corto = (s: string, n = 20) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);

    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);

    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  return { open, setOpen, ref };
}

function Pill({ dim, selected, onChange }: { dim: FilterDim; selected: string[]; onChange: (v: string[]) => void }) {
  const { open, setOpen, ref } = usePopover();
  const [q, setQ] = useState("");
  const show = dim.show ?? ((v: string) => v);
  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();

    return dim.options.filter((o) => !t || show(o).toLowerCase().includes(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dim.options, q]);
  const lista = visibles.slice(0, LIMITE);
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  const texto =
    selected.length === 0
      ? "Todos"
      : selected.length === 1
        ? corto(show(selected[0]))
        : `${corto(show(selected[0]), 12)} +${selected.length - 1}`;

  return (
    <div ref={ref} className="relative">
      <div
        className={`inline-flex items-center rounded-xl border shadow-sm transition-colors ${
          selected.length ? "bg-primary-50 border-primary-200" : "bg-white border-default-200 hover:border-default-300"
        }`}
      >
        <button
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 pl-3 pr-2 py-2 rounded-xl text-sm"
          type="button"
          onClick={() => setOpen((o) => !o)}
        >
          <Icon height="15" icon={dim.icon} width="15" />
          <span className={`text-xs ${selected.length ? "text-primary-700" : "text-gray-500"}`}>{dim.label}</span>
          <b className={selected.length ? "text-primary-700" : "text-gray-900"}>{texto}</b>
          <Icon className="text-gray-400" height="14" icon="heroicons:chevron-down" width="14" />
        </button>
        {selected.length > 0 && (
          <button
            aria-label={`Quitar filtro ${dim.label}`}
            className="pr-2.5 pl-0.5 py-2 text-gray-400 hover:text-red-600"
            type="button"
            onClick={() => onChange([])}
          >
            <Icon height="14" icon="heroicons:x-mark" width="14" />
          </button>
        )}
      </div>

      {open && (
        <div
          aria-label={dim.label}
          className="absolute z-40 top-[calc(100%+8px)] left-0 w-[min(320px,calc(100vw-2rem))] bg-white rounded-2xl p-2.5 shadow-[0_12px_40px_-6px_rgba(15,23,42,.22),0_2px_8px_rgba(15,23,42,.08)]"
          role="dialog"
        >
          <label className="flex items-center gap-2 px-2.5 border border-default-200 rounded-xl bg-default-50 text-gray-500 focus-within:bg-white focus-within:border-primary-400">
            <Icon height="15" icon="heroicons:magnifying-glass" width="15" />
            <input
              autoFocus
              className="flex-1 bg-transparent py-2 text-sm text-gray-900 outline-none min-w-0"
              placeholder={`Buscar ${dim.label.toLowerCase()}…`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <div className="flex items-center justify-between text-xs text-gray-500 mx-0.5 my-2">
            <span>{selected.length ? `${selected.length} seleccionados` : `${dim.options.length} opciones`}</span>
            <span className="flex gap-1">
              <button
                className="px-1.5 py-0.5 rounded-md text-primary-700 hover:bg-primary-50"
                type="button"
                onClick={() => onChange(Array.from(new Set([...selected, ...lista])))}
              >
                Seleccionar visibles
              </button>
              <button
                className="px-1.5 py-0.5 rounded-md text-primary-700 hover:bg-primary-50 disabled:text-gray-300 disabled:hover:bg-transparent"
                disabled={!selected.length}
                type="button"
                onClick={() => onChange([])}
              >
                Limpiar
              </button>
            </span>
          </div>
          <ul className="max-h-[260px] overflow-y-auto">
            {lista.map((o) => (
              <li key={o}>
                <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-default-100 text-sm">
                  <input
                    checked={selected.includes(o)}
                    className="w-4 h-4 accent-[#0b3a55] shrink-0"
                    type="checkbox"
                    onChange={() => toggle(o)}
                  />
                  <span className="truncate" title={show(o)}>
                    {show(o)}
                  </span>
                </label>
              </li>
            ))}
            {lista.length === 0 && <li className="p-3 text-center text-xs text-gray-500">Sin resultados</li>}
          </ul>
          {visibles.length > LIMITE && (
            <p className="p-2 text-center text-xs text-gray-500">
              Mostrando {LIMITE} de {visibles.length}. Escribe para acotar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Una sola fila de filtros sobre los gráficos: todos los gráficos y cifras de abajo se ajustan a ella */
export default function FilterBar({
  dims,
  value,
  onChange,
  children,
}: {
  dims: FilterDim[];
  value: Filters;
  onChange: (f: Filters) => void;
  /** Controles extra a la derecha (por ejemplo, "Medir en") */
  children?: React.ReactNode;
}) {
  const hayActivos = Object.values(value).some((v) => v.length > 0);
  const set = (k: string, v: string[]) => {
    const n = { ...value };

    if (v.length) n[k] = v;
    else delete n[k];
    onChange(n);
  };

  return (
    <div aria-label="Filtros" className="flex flex-wrap items-center gap-2.5" role="search">
      {dims.map((d) => (
        <Pill key={d.key} dim={d} selected={value[d.key] ?? []} onChange={(v) => set(d.key, v)} />
      ))}
      {hayActivos && (
        <button
          className="text-sm text-gray-500 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50"
          type="button"
          onClick={() => onChange({})}
        >
          Limpiar todo
        </button>
      )}
      {children && <div className="ml-auto flex items-center gap-3">{children}</div>}
    </div>
  );
}
