"use client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Heading from "@/components/ui/Heading";
import AddProductForm from "@/components/product/AddProductForm";
import ProductForm from "@/components/product/ProductForm";

export default function CreateProductPage() {
  return (
    <ProtectedRoute allowedRoles={[1,3]}>
      <Heading>Crear Producto</Heading>
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="w-full pt-5">
          <AddProductForm>
            <ProductForm />
          </AddProductForm>
        </div>
      </div>
    </ProtectedRoute>
  );
}
