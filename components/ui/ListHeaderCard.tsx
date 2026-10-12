"use client";
import { Button, Input } from "@heroui/react";
import { Icon } from "@iconify/react";
import { ReactNode, useState } from "react";

type ListHeaderCardProps = {
  title: string;
  description: string;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  actionLabel?: string;
  onAction?: () => void;
  extra?: ReactNode;
  filters?: ReactNode;
  filtersCols?: 2 | 3 | 4;
  activeFilters?: number;
  onClearFilters?: () => void;
};

export default function ListHeaderCard({
  title,
  description,
  search,
  onSearchChange,
  searchPlaceholder,
  actionLabel,
  onAction,
  extra,
  filters,
  filtersCols = 3,
  activeFilters = 0,
  onClearFilters,
}: ListHeaderCardProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="rounded-2xl bg-white border border-default-200 shadow-sm p-5 sm:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="lg:w-72 shrink-0">
          <h1 className="text-2xl font-bold leading-tight">{title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>

        <div className="flex-1 min-w-0">
          <Input
            isClearable
            placeholder={searchPlaceholder}
            startContent={<Icon className="text-gray-400" height="20" icon="mdi:magnify" width="20" />}
            value={search}
            onClear={() => onSearchChange("")}
            onValueChange={onSearchChange}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {filters && (
            <Button
              className="bg-white border border-default-200"
              variant="flat"
              startContent={<Icon height="18" icon="heroicons:funnel" width="18" />}
              onPress={() => setShowFilters((v) => !v)}
            >
              Filtros
              {activeFilters > 0 && (
                <span className="ml-1 text-[11px] font-bold bg-primary-500 text-white rounded-full w-5 h-5 inline-flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
            </Button>
          )}
          {extra}
          {actionLabel && onAction && (
            <Button
              color="primary"
              startContent={<Icon height="20" icon="heroicons:plus" width="20" />}
              onPress={onAction}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </div>

      {filters && showFilters && (
        <div className="mt-5 pt-5 border-t border-default-200 flex flex-col md:flex-row md:items-end gap-4">
          <div
            className={`flex-1 grid grid-cols-1 gap-4 ${
              filtersCols === 4
                ? "sm:grid-cols-2 lg:grid-cols-4"
                : filtersCols === 2
                  ? "sm:grid-cols-2"
                  : "sm:grid-cols-3"
            }`}
          >
            {filters}
          </div>
          {onClearFilters && (
            <Button
              isDisabled={activeFilters === 0 && !search}
              variant="light"
              onPress={onClearFilters}
            >
              Limpiar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
