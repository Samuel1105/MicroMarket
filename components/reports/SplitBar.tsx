"use client";
import React from "react";

import { bs } from "@/src/utils/report-format";

export type SplitSegment = {
  label: string;
  value: number;
  color: string;
  /** Explicación corta bajo el monto */
  note?: string;
};

/**
 * "De cada Bs. 100 que vendiste, a dónde fue": una sola barra dividida en partes,
 * con el monto de cada una escrito debajo. Pensada para leerse sin explicación.
 */
export default function SplitBar({
  total,
  totalLabel,
  segments,
  /** Parte que sobra (utilidad): si es negativa, se muestra como faltante */
  remainder,
}: {
  total: number;
  totalLabel: string;
  segments: SplitSegment[];
  remainder: SplitSegment;
}) {
  const usado = segments.reduce((s, x) => s + Math.max(x.value, 0), 0);
  const falta = remainder.value < 0;
  // Si se gastó más de lo vendido, la barra se escala al gasto para que todo quepa
  const escala = Math.max(total, usado) || 1;
  const parts = [...segments, ...(falta ? [] : [remainder])].filter((s) => s.value > 0);

  const porCien = (v: number) => Math.round((v / (total || 1)) * 100);
  const enteros = segments.map((s) => porCien(s.value));
  const restoPor = 100 - enteros.reduce((a, b) => a + b, 0);

  return (
    <div>
      <p className="text-sm text-gray-700 mb-4">
        <span className="font-semibold">{totalLabel}: {bs(total)}.</span>{" "}
        De cada <b>Bs. 100</b> que vendiste:{" "}
        {segments.map((s, i) => (
          <React.Fragment key={s.label}>
            {enteros[i] > 0 && (
              <>
                <b style={{ color: s.color }}>Bs. {enteros[i]}</b> {s.note ? s.note.toLowerCase() : s.label.toLowerCase()}
                {", "}
              </>
            )}
          </React.Fragment>
        ))}
        {falta ? (
          <>
            y <b style={{ color: remainder.color }}>te faltaron Bs. {Math.abs(restoPor)}</b>.
          </>
        ) : (
          <>
            y <b style={{ color: remainder.color }}>te quedaron Bs. {restoPor}</b>.
          </>
        )}
      </p>

      <div className="flex h-11 w-full overflow-hidden rounded-xl bg-default-100" role="img"
        aria-label={`${totalLabel}: ${parts.map((p) => `${p.label} ${bs(p.value)}`).join(", ")}`}>
        {parts.map((p) => (
          <div key={p.label} style={{ width: `${(p.value / escala) * 100}%`, background: p.color }}
            className="h-full border-r-2 border-white last:border-r-0" title={`${p.label}: ${bs(p.value)}`} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[...segments, remainder].map((s) => (
          <div key={s.label} className="flex gap-2.5">
            <i className="mt-1 inline-block w-3 h-3 rounded-sm shrink-0" style={{ background: s.color }} />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-lg font-bold leading-tight tabular-nums">{bs(s.value, 0)}</p>
              <p className="text-xs text-gray-500">
                {total > 0 ? `${((s.value / total) * 100).toFixed(1)}% de lo vendido` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
