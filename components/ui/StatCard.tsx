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
}: {
  icon: string;
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className="rounded-2xl bg-white border border-default-200 shadow-sm p-4 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${TONES[tone]}`}>
        <Icon height="24" icon={icon} width="24" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold leading-tight truncate">{value}</p>
        {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}
