import { ProtectedRoute } from "@/components/ProtectedRoute";
import PurchaseHistoryView from "@/components/purchase/PurchaseHistoryView";
import Heading from "@/components/ui/Heading";

export default function page() {
  return (
    <ProtectedRoute allowedRoles={[1, 5]}>
      <div className="w-full">
        <Heading>Historial de Compras</Heading>
        <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="w-full pt-5">
            <PurchaseHistoryView />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}