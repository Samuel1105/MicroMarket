import { Link } from "@heroui/react";
import { Icon } from "@iconify/react/dist/iconify.js";

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
        <div
          key={category.id}
          className="rounded-2xl border border-default-200 bg-white shadow-sm hover:shadow-md hover:border-primary-200 transition-all p-4 sm:p-5"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
              <Icon icon="heroicons:tag" width="22" height="22" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base truncate">{category.nombre}</p>
            </div>

            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary-50 text-secondary-700 shrink-0">
              {category.cantidadProductos}{" "}
              {category.cantidadProductos === 1 ? "producto" : "productos"}
            </span>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                className="w-9 h-9 rounded-lg border border-default-200 flex items-center justify-center text-gray-500 hover:text-primary-600 hover:bg-primary-50 hover:border-primary-300 transition-colors"
                href={`/Dashboard/Product/Category/${category.id}/Edit`}
              >
                <Icon icon="heroicons:pencil-square" width="17" height="17" />
              </Link>
              <div className="w-9 h-9 rounded-lg border border-default-200 flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors">
                <DeleteCategoryForm
                  categoria={category}
                  onDeleteSuccess={onDeleteSuccess}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
