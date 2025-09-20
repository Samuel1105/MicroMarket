import { Card, CardBody, Link } from "@heroui/react";
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
        <Card key={item.id} className="w-full">
          <CardBody className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h2 className="font-semibold text-lg mb-1 leading-tight">
                  {`${item.nombre} `}
                </h2>
              </div>
              <div className="flex gap-2 ml-2">
                <Link
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  href={`/Dashboard/Contact/Customer/${item.id}/Edit`}
                >
                  <Icon
                    color="#0007fc"
                    height="20"
                    icon="iconamoon:edit-thin"
                    width="20"
                  />
                </Link>
                <div className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <DeleteCustomerConfirm
                    cliente={item}
                    onDeleteSuccess={handleDeleteSuccess}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon
                  className="text-gray-500"
                  height="16"
                  icon="heroicons:envelope"
                  width="16"
                />
                <span className="text-sm text-gray-700">{item.correo}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon
                  className="text-gray-500"
                  height="16"
                  icon="heroicons:identification"
                  width="16"
                />
                <span className="text-sm text-gray-700">{item.carnet}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </>
  );
}
