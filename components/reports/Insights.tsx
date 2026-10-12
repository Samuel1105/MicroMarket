"use client";
import { Icon } from "@iconify/react";
import React from "react";

export type Insight = {
  tone: "good" | "warn" | "info";
  text: React.ReactNode;
};

const STYLE = {
  good: { icon: "heroicons:check-circle", box: "bg-green-50 text-green-800", ico: "text-green-600" },
  warn: { icon: "heroicons:exclamation-triangle", box: "bg-amber-50 text-amber-900", ico: "text-amber-600" },
  info: { icon: "heroicons:light-bulb", box: "bg-secondary-50 text-secondary-900", ico: "text-secondary-600" },
} as const;

export default function Insights({ items }: { items: Insight[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white border border-default-200 shadow-sm p-5">
      <h3 className="font-bold text-base mb-3">Qué hacer con estos números</h3>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${STYLE[it.tone].box}`}>
            <Icon className={`mt-0.5 shrink-0 ${STYLE[it.tone].ico}`} height="18" icon={STYLE[it.tone].icon} width="18" />
            <span>{it.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
