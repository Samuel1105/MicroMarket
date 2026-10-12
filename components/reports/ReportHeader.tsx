"use client";
import { DateRangePicker } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import React from "react";

import Breadcrumbs from "@/components/ui/Breadcrumbs";
import {
  diasEnRango,
  formatRangoEs,
  presetRange,
  REPORT_PRESETS,
} from "@/src/utils/report-dates";

export type ReportRange = { start: string; end: string };

type Props = {
  /** Nombre del reporte en la ruta de navegación */
  crumb: string;
  title: string;
  /** La pregunta que este reporte responde */
  question: string;
  /** Sin rango: el reporte es una foto de hoy (p. ej. Almacén) */
  range?: ReportRange;
  onRangeChange?: (range: ReportRange) => void;
  /** Texto que reemplaza al selector de fechas cuando no hay rango */
  snapshotNote?: string;
};

export default function ReportHeader({ crumb, title, question, range, onRangeChange, snapshotNote }: Props) {
  if (!range || !onRangeChange) {
    return (
      <div className="space-y-4">
        <Breadcrumbs items={[{ label: "Reportes" }, { label: crumb }]} />
        <div className="rounded-2xl bg-white border border-default-200 shadow-sm p-5 sm:p-6">
          <h1 className="text-2xl font-bold leading-tight">{title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{question}</p>
          {snapshotNote && (
            <p className="mt-4 pt-4 border-t border-default-200 text-xs text-gray-500">{snapshotNote}</p>
          )}
        </div>
      </div>
    );
  }

  const dias = diasEnRango(range.start, range.end);

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Reportes" }, { label: crumb }]} />

      <div className="rounded-2xl bg-white border border-default-200 shadow-sm p-5 sm:p-6">
        <h1 className="text-2xl font-bold leading-tight">{title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{question}</p>

        <div className="mt-5 pt-5 border-t border-default-200 flex flex-col xl:flex-row xl:items-center gap-4">
          <div className="flex flex-wrap gap-2">
            {REPORT_PRESETS.map((p) => {
              const r = presetRange(p.key);
              const active = r.start === range.start && r.end === range.end;

              return (
                <button
                  key={p.key}
                  aria-pressed={active}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    active
                      ? "bg-primary-500 border-primary-500 text-white"
                      : "bg-white border-default-200 text-gray-600 hover:border-primary-300 hover:text-primary-700"
                  }`}
                  type="button"
                  onClick={() => onRangeChange(r)}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 xl:ml-auto">
            <DateRangePicker
              className="sm:w-72"
              label="Rango de fechas"
              size="sm"
              value={{ start: parseDate(range.start), end: parseDate(range.end) }}
              visibleMonths={2}
              onChange={(value) => {
                const v = value as { start: { toString(): string }; end: { toString(): string } } | null;

                if (v) onRangeChange({ start: v.start.toString(), end: v.end.toString() });
              }}
            />
            <p className="text-xs text-gray-500 sm:w-44">
              {formatRangoEs(range.start, range.end)}
              <br />
              {dias} {dias === 1 ? "día" : "días"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
