"use client";
import React from "react";

type Opt<T extends string | number> = { value: T; label: string };

/** Selector de 2 o 3 opciones tipo "píldora" (p. ej. Movimientos | Unidades, Top 10 | Top 20) */
export default function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: Opt<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div aria-label={label} className="inline-flex p-[3px] rounded-[10px] bg-default-100" role="group">
      {options.map((o) => (
        <button
          key={String(o.value)}
          aria-pressed={value === o.value}
          className={`px-2.5 py-1 rounded-[7px] text-xs transition-colors ${
            value === o.value
              ? "bg-white text-primary-700 font-semibold shadow-sm"
              : "text-gray-500 font-medium hover:text-gray-800"
          }`}
          type="button"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
