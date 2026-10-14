"use client";
import React from "react";
import { Icon } from "@iconify/react";

import ProductFormBasic from "./ProductFormBasic";
import ProductFormUnidades from "./ProductFormUnidades";

import { ProductoCompleto } from "@/src/schema/SchemaProduts";

interface ProductFormProps {
  producto?: ProductoCompleto; // Opcional: si está presente, es modo edición
}

function Seccion({
  icono,
  titulo,
  ayuda,
  children,
  className = "",
}: {
  icono: string;
  titulo: string;
  ayuda: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      <header className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <Icon height="22" icon={icono} width="22" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{titulo}</h3>
          <p className="text-xs text-gray-500">{ayuda}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

export default function ProductForm({ producto }: ProductFormProps) {
  const isEditMode = !!producto;

  return (
    <div className="space-y-5">
      {isEditMode && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Icon height="20" icon="heroicons:pencil-square" width="20" />
          <span>
            Estás editando <strong>{producto?.nombre}</strong>. Los cambios de precio valen para las próximas ventas.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <Seccion
          ayuda="Nombre, categoría y cuándo avisar que se acaba."
          className="lg:col-span-5"
          icono="heroicons:tag"
          titulo="Datos del producto"
        >
          <ProductFormBasic producto={producto} />
        </Seccion>

        <Seccion
          ayuda="La primera unidad es la base (la más pequeña). Las demás indican cuántas unidades base contienen."
          className="lg:col-span-7"
          icono="heroicons:scale"
          titulo="Unidades y precios de venta"
        >
          <ProductFormUnidades producto={producto} />
        </Seccion>
      </div>
    </div>
  );
}
