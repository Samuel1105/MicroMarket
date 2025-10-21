import { ProtectedRoute } from "@/components/ProtectedRoute";
import AddPurchaseForm from "@/components/purchase/AddPurchaseForm";
import PurchaseForm from "@/components/purchase/PurchaseForm";
import Heading from "@/components/ui/Heading";

export default function Page() {
  return (
    <ProtectedRoute allowedRoles={[1, 5]}>
      <div className="w-full">
        <Heading>Registrar una nueva Compra</Heading>
        {/* Elimina el max-w fijo y permite full-bleed controlado por padding */}
        <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="w-full pt-5">
            <AddPurchaseForm>
              <PurchaseForm />
            </AddPurchaseForm>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
