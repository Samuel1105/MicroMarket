"use client";
import { Tooltip } from "@heroui/react";
import { Icon } from "@iconify/react";
import React from "react";

type Tone = "primary" | "secondary" | "success" | "danger" | "neutral";

const TONES: Record<Tone, string> = {
  primary: "bg-primary-50 text-primary-600",
  secondary: "bg-secondary-50 text-secondary-600",
  success: "bg-green-50 text-green-600",
  danger: "bg-red-50 text-red-600",
  neutral: "bg-default-100 text-gray-600",
};

type Props = {
  icon: string;
  label: string;
  value: string;
  /** Línea corta bajo la cifra */
  hint?: string;
  /** Qué significa exactamente esta cifra (aparece al pasar el mouse) */
  definition?: string;
  /** Variación % contra el período anterior. null = no hay base para comparar. */
  delta?: number | null;
  /** true si que suba es bueno (ventas, utilidad); false si es al revés (costos) */
  upIsGood?: boolean;
  /** Si no se quiere juzgar la variación como buena/mala (p. ej. compras) */
  neutralDelta?: boolean;
  tone?: Tone;
};

export default function Kpi({
  icon,
  label,
  value,
  hint,
  definition,
  delta,
  upIsGood = true,
  neutralDelta = false,
  tone = "primary",
}: Props) {
  let deltaEl: React.ReactNode = null;

  if (delta === null) {
    deltaEl = <span className="text-xs text-gray-400">Sin datos del período anterior</span>;
  } else if (delta !== undefined) {
    const sube = delta > 0.05;
    const baja = delta < -0.05;
    const bueno = neutralDelta ? null : sube ? upIsGood : baja ? !upIsGood : null;
    const color =
      bueno === null ? "text-gray-500" : bueno ? "text-green-700" : "text-red-600";

    deltaEl = (
      <span className={`text-xs font-semibold flex items-center gap-1 ${color}`}>
        <Icon
          height="14"
          icon={sube ? "heroicons:arrow-trending-up" : baja ? "heroicons:arrow-trending-down" : "heroicons:minus"}
          width="14"
        />
        {sube ? "+" : ""}
        {delta.toFixed(1)}% <span className="font-normal text-gray-500">vs período anterior</span>
      </span>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-default-200 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${TONES[tone]}`}>
            <Icon height="20" icon={icon} width="20" />
          </div>
          <p className="text-sm text-gray-600 truncate">{label}</p>
        </div>
        {definition && (
          <Tooltip content={definition} placement="top">
            <button aria-label={`Qué significa ${label}`} className="text-gray-400 hover:text-gray-600" type="button">
              <Icon height="16" icon="heroicons:information-circle" width="16" />
            </button>
          </Tooltip>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold leading-tight tabular-nums">{value}</p>
        {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      </div>
      {deltaEl}
    </div>
  );
}
