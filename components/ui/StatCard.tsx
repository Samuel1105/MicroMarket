"use client";
import { Icon } from "@iconify/react";

type Tone = "primary" | "secondary" | "success" | "danger" | "warning" | "neutral";

const TONES: Record<Tone, string> = {
  primary: "bg-primary-50 text-primary-600",
  secondary: "bg-secondary-50 text-secondary-600",
  success: "bg-green-50 text-green-600",
  danger: "bg-red-50 text-red-600",
  warning: "bg-amber-50 text-amber-600",
  neutral: "bg-default-100 text-gray-600",
};

export default function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "primary",
  onClick,
  actionLabel = "Ver detalle",
}: {
  icon: string;
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
  /** Si se pasa, la tarjeta es un botón (por ejemplo, para abrir el detalle) */
  onClick?: () => void;
  actionLabel?: string;
}) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      className={`rounded-2xl bg-white border border-default-200 shadow-sm p-4 flex items-center gap-4 text-left w-full ${
        onClick ? "cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400" : ""
      }`}
      type={onClick ? "button" : undefined}
      onClick={onClick}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${TONES[tone]}`}>
        <Icon height="24" icon={icon} width="24" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold leading-tight truncate">{value}</p>
        {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
      </div>
      {onClick && (
        <span className="ml-auto flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary-600">
          {actionLabel}
          <Icon height="16" icon="heroicons:chevron-right" width="16" />
        </span>
      )}
    </Tag>
  );
}
