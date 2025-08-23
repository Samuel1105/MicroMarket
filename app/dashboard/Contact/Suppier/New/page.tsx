import AddSupplierForm from "@/components/contact/AddSupplierForm";
import SupplierForm from "@/components/contact/SupplierForm";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Heading from "@/components/ui/Heading";

export default function CreateSupplierPage() {
  return (
    <ProtectedRoute allowedRoles={[1, 3, 4]}>
      <Heading> Nuevo Proveedor </Heading>
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="w-full pt-5">
          <AddSupplierForm>
            <SupplierForm />
          </AddSupplierForm>
        </div>
      </div>
    </ProtectedRoute>
  )
}
