import { Card, CardBody, Link } from "@heroui/react";
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
        <Card
          key={item.id}
          className="w-full shadow-sm hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500"
        >
          <CardBody className="p-3">
            {/* Header con nombre y acciones */}
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h2 className="font-bold text-lg text-gray-800 leading-tight mb-1">
                  {item.nombre}
                </h2>
                {/* Descripción si existe */}
                {item.descripcion && (
                  <p className="text-sm text-gray-500 leading-tight mb-2">
                    {item.descripcion}
                  </p>
                )}
                {/* Estado y Stock en badges */}
                <div className="flex gap-2 flex-wrap">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                      item.estado === 1
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {item.estado === 1 ? "Activo" : "Inactivo"}
                  </span>
                  {item.stockTotal !== undefined && (
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                        item.stockTotal > 10
                          ? "bg-blue-100 text-blue-700"
                          : item.stockTotal > 0
                            ? "bg-orange-100 text-orange-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      Stock: {item.stockTotal}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 ml-2">
                <Link
                  className="p-1.5 rounded-md hover:bg-blue-50 transition-colors"
                  href={`/Dashboard/Product/${item.id}/Edit`}
                >
                  <Icon
                    className="text-blue-600"
                    height="18"
                    icon="iconamoon:edit-thin"
                    width="18"
                  />
                </Link>
                <div className="p-1.5 rounded-md hover:bg-red-50 transition-colors">
                  <DeleteProductConfirm
                    producto={item}
                    onDeleteSuccess={handleDeleteSuccess}
                  />
                </div>
              </div>
            </div>

            {/* Info compacta en líneas */}
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <Icon
                  className="text-green-600 flex-shrink-0"
                  height="14"
                  icon="heroicons:tag"
                  width="14"
                />
                <span className="text-gray-600 font-medium">
                  {item.Categoria.nombre}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Icon
                  className="text-purple-600 flex-shrink-0"
                  height="14"
                  icon="heroicons:building-storefront"
                  width="14"
                />
                <span className="text-gray-600">{item.Proveedor.nombre}</span>
              </div>

              {item.UnidadMedida.abreviatura && (
                <div className="flex items-center gap-2">
                  <Icon
                    className="text-orange-600 flex-shrink-0"
                    height="14"
                    icon="heroicons:scale"
                    width="14"
                  />
                  <span className="text-gray-600 text-xs">
                    Unidad:{" "}
                    <span className="font-medium">
                      {item.UnidadMedida.abreviatura}
                    </span>
                  </span>
                </div>
              )}

              {/* Precio de venta si existe */}
              {item.precioVenta && (
                <div className="flex items-center gap-2">
                  <Icon
                    className="text-emerald-600 flex-shrink-0"
                    height="14"
                    icon="heroicons:currency-dollar"
                    width="14"
                  />
                  <span className="text-gray-600 text-sm">
                    <span className="font-semibold text-emerald-700">
                      Bs. {item.precioVenta}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      ))}
    </>
  );
}
