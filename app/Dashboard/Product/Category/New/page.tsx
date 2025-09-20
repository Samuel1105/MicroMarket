import AddCategoryForm from "@/components/product/AddCategoryForm";
import CategoryForm from "@/components/product/CategoryForm";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Heading from "@/components/ui/Heading";

export default function CreateCategoryView() {
  return (
    <ProtectedRoute allowedRoles={[1, 2]}>
      <Heading> Nueva Categoria</Heading>
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="w-full pt-5">
          <AddCategoryForm>
            <CategoryForm />
          </AddCategoryForm>
        </div>
      </div>
    </ProtectedRoute>
  );
}
