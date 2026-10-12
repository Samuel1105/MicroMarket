import { Link } from "@heroui/react";
import React from "react";
import { Icon } from "@iconify/react/dist/iconify.js";

import DeleteCustomerConfirm from "./DeleteCustomerConfirm";

import { CustomerList } from "@/src/schema/SchemaContact";

export default function CardMobileCustomer({
  items,
  handleDeleteSuccess,
}: {
  items: CustomerList;
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
            <div className="w-12 h-12 rounded-full bg-secondary-50 text-secondary-600 flex items-center justify-center shrink-0">
              <Icon icon="heroicons:user" width="22" height="22" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base truncate">{item.nombre}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1.5 min-w-0">
                  <Icon icon="heroicons:envelope" width="14" height="14" className="shrink-0" />
                  <span className="truncate">{item.correo}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon icon="heroicons:identification" width="14" height="14" />
                  {item.carnet}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                className="w-9 h-9 rounded-lg border border-default-200 flex items-center justify-center text-gray-500 hover:text-primary-600 hover:bg-primary-50 hover:border-primary-300 transition-colors"
                href={`/Dashboard/Contact/Customer/${item.id}/Edit`}
              >
                <Icon icon="heroicons:pencil-square" width="17" height="17" />
              </Link>
              <div className="w-9 h-9 rounded-lg border border-default-200 flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors">
                <DeleteCustomerConfirm
                  cliente={item}
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
