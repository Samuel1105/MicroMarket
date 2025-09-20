import { Card, CardBody, CardFooter, CardHeader, Link } from "@heroui/react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Button } from "@heroui/react";

import DeleteCategoryForm from "./DeleteCategoryForm";

import { CategoryList } from "@/src/schema/SchemaProduts";

type CategoryCardProps = {
  categories: CategoryList;
  onDeleteSuccess?: () => void;
};

export default function CategoryCard({
  categories,
  onDeleteSuccess,
}: CategoryCardProps) {
  return (
    <>
      {categories.map((category) => (
        <Card
          key={category.id}
          className="hover:shadow-xl transition-shadow duration-300 rounded-xl border border-gray-200"
        >
          <CardHeader className="flex flex-col items-start gap-1 p-6">
            <h3 className="text-xl font-bold text-default-900">
              {category.nombre}
            </h3>
          </CardHeader>
          <CardBody className="p-6 pt-0">
            <div className="flex flex-col items-start gap-1">
              <p className="text-4xl font-extrabold text-primary-600">
                {category.cantidadProductos}
              </p>
              <p className="text-sm text-default-500">productos disponibles</p>
            </div>
          </CardBody>
          <CardFooter className="flex justify-between p-6 pt-0 border-t border-gray-100 mt-auto">
            <Button
              as={Link}
              color="primary"
              href={`/Dashboard/Contact/Suppier/${category.id}/products`}
              size="sm"
              variant="flat"
            >
              Ver Productos
            </Button>
            <div className="flex gap-2">
              <Link
                className="transition-transform hover:scale-110"
                href={`/Dashboard/Product/Category/${category.id}/Edit`}
              >
                <Icon
                  color="#0007fc"
                  height="24"
                  icon="iconamoon:edit-thin"
                  width="24"
                />
              </Link>
              <DeleteCategoryForm
                categoria={category}
                onDeleteSuccess={onDeleteSuccess}
              />
            </div>
          </CardFooter>
        </Card>
      ))}
    </>
  );
}
