"use client";
import Link from "next/link";
import { Icon } from "@iconify/react";

export type Crumb = { label: string; href?: string };

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
      <Link
        className="flex items-center gap-1.5 hover:text-primary-600 transition-colors"
        href="/Dashboard"
      >
        <Icon height="16" icon="heroicons:home" width="16" />
        Inicio
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={item.label} className="flex items-center gap-2">
            <Icon
              className="text-gray-400"
              height="14"
              icon="heroicons:chevron-right"
              width="14"
            />
            {item.href && !isLast ? (
              <Link className="hover:text-primary-600 transition-colors" href={item.href}>
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "font-semibold text-gray-900" : ""}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
