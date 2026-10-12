import { Link } from "@heroui/react";
import React from "react";
import { Icon } from "@iconify/react/dist/iconify.js";

import DeleteProductConfirm from "./DeleteProductConfirm";

import { ProductListType } from "@/src/schema/SchemaProduts";

export default function CardMobileProduct({
  items,
  handleDeleteSuccess,
}: {
  items: ProductListType;
  handleDeleteSuccess: () => void;
}) {
  return (
    <>
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-default-200 bg-white shadow-sm hover:shadow-md hover:border-primary-200 transition-all p-4 sm:p-5"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
              <Icon icon="heroicons:cube" width="22" height="22" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-base truncate">{item.nombre}</p>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    item.estado === 1
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {item.estado === 1 ? "Activo" : "Inactivo"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Icon icon="heroicons:tag" width="14" height="14" />
                  {item.Categoria.nombre}
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon icon="heroicons:building-storefront" width="14" height="14" />
                  {item.Proveedor.nombre}
                </span>
                {item.UnidadMedida.abreviatura && (
                  <span className="flex items-center gap-1.5">
                    <Icon icon="heroicons:scale" width="14" height="14" />
                    {item.UnidadMedida.abreviatura}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2">
                {item.precioVenta && (
                  <span className="text-sm font-bold text-primary-700">
                    Bs. {item.precioVenta}
                  </span>
                )}
                {item.stockTotal !== undefined && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      item.stockTotal > 10
                        ? "bg-secondary-50 text-secondary-700"
                        : item.stockTotal > 0
                          ? "bg-orange-50 text-orange-700"
                          : "bg-red-50 text-red-700"
                    }`}
                  >
                    Stock: {item.stockTotal}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                className="w-9 h-9 rounded-lg border border-default-200 flex items-center justify-center text-gray-500 hover:text-primary-600 hover:bg-primary-50 hover:border-primary-300 transition-colors"
                href={`/Dashboard/Product/${item.id}/Edit`}
              >
                <Icon icon="heroicons:pencil-square" width="17" height="17" />
              </Link>
              <div className="w-9 h-9 rounded-lg border border-default-200 flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors">
                <DeleteProductConfirm
                  producto={item}
                  onDeleteSuccess={handleDeleteSuccess}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
