"use client";
import { Icon } from "@iconify/react";
import React, { useState } from "react";

import Echart from "./Echart";

export type TablaDatos = { head: string[]; rows: (string | number)[][] };

type Props = {
  title: string;
  /** La pregunta que este gráfico responde */
  question: string;
  option: any;
  height?: number;
  onClick?: (p: any) => void;
  /** Controles propios del gráfico (Top 10 / Top 20, etc.) */
  tools?: React.ReactNode;
  /** Los mismos datos en tabla (así nunca hace falta pasar el mouse para leer un valor) */
  table?: TablaDatos;
  empty?: boolean;
  emptyText?: string;
  /** Mientras se recalcula, el gráfico se queda donde estaba, atenuado */
  stale?: boolean;
  className?: string;
};

/** Tarjeta de gráfico: título + pregunta, controles propios, vista de tabla y animación */
export default function ChartPanel({
  title,
  question,
  option,
  height = 320,
  onClick,
  tools,
  table,
  empty,
  emptyText = "Sin datos con estos filtros. Quita alguno para ver resultados.",
  stale,
  className = "",
}: Props) {
  const [verTabla, setVerTabla] = useState(false);

  return (
    <section
      aria-label={title}
      className={`rounded-2xl bg-white border border-default-200 shadow-sm p-5 pb-3 min-w-0 ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h3 className="font-bold text-base leading-tight">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{question}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {tools}
          {table && (
            <button
              aria-label={verTabla ? "Ver gráfico" : "Ver tabla"}
              className="grid place-items-center w-8 h-8 rounded-[9px] bg-default-100 text-gray-500 hover:bg-primary-50 hover:text-primary-700 transition-colors"
              title={verTabla ? "Ver gráfico" : "Ver tabla"}
              type="button"
              onClick={() => setVerTabla((v) => !v)}
            >
              <Icon height="16" icon={verTabla ? "heroicons:chart-bar" : "heroicons:table-cells"} width="16" />
            </button>
          )}
        </div>
      </div>

      <div className={`transition-opacity duration-200 ${stale ? "opacity-45" : ""}`}>
        {empty ? (
          <div className="grid place-items-center text-center text-sm text-gray-500" style={{ height }}>
            {emptyText}
          </div>
        ) : verTabla && table ? (
          <div className="overflow-auto" style={{ maxHeight: Math.max(height, 300) }}>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {table.head.map((h, i) => (
                    <th
                      key={h}
                      className={`sticky top-0 bg-white py-2 px-2.5 text-xs font-semibold text-gray-500 border-b border-default-200 ${i === 0 ? "text-left" : "text-right"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i} className="hover:bg-default-50">
                    {r.map((c, j) => (
                      <td
                        key={j}
                        className={`py-2 px-2.5 border-b border-default-100 ${j === 0 ? "text-left" : "text-right tabular-nums"}`}
                      >
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Echart
            height={height}
            label={`${title}. Usa la vista de tabla para ver los valores exactos.`}
            option={option}
            onClick={onClick}
          />
        )}
      </div>
    </section>
  );
}
