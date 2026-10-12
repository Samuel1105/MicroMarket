"use client";
import { DateRangePicker } from "@heroui/react";

/**
 * Selector de rango de fechas con calendario.
 * Devuelve fechas en formato YYYY-MM-DD ("" si se borra el rango).
 * `resetKey` se incrementa desde el padre para limpiar el selector.
 */
export default function DateRangeFilter({
  onChange,
  resetKey,
}: {
  onChange: (from: string, to: string) => void;
  resetKey: number;
}) {
  return (
    <DateRangePicker
      key={resetKey}
      label="Rango de fechas"
      visibleMonths={2}
      onChange={(value) => {
        const range = value as { start: { toString(): string }; end: { toString(): string } } | null;

        onChange(range ? range.start.toString() : "", range ? range.end.toString() : "");
      }}
    />
  );
}
