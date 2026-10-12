"use client";
import React from "react";

type LegendItem = { label: string; color: string };

export default function ChartCard({
  title,
  subtitle,
  legend,
  empty,
  emptyText = "No hay datos en este rango de fechas.",
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  legend?: LegendItem[];
  /** true → muestra el mensaje de "sin datos" en lugar del gráfico */
  empty?: boolean;
  emptyText?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl bg-white border border-default-200 shadow-sm p-5 ${className}`}>
      <div className="mb-3">
        <h3 className="font-bold text-base leading-tight">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        {legend && legend.length > 1 && (
          <div className="flex flex-wrap gap-4 mt-2">
            {legend.map((l) => (
              <span key={l.label} className="flex items-center gap-1.5 text-xs text-gray-600">
                <i className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        )}
      </div>
      {empty ? (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400">{emptyText}</div>
      ) : (
        children
      )}
    </div>
  );
}
