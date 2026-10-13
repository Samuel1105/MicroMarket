import PurchaseReceiptsView from "@/components/purchase/PurchaseReceiptsView";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function PurchaseReceiptsPage() {
  return (
    <ProtectedRoute allowedRoles={[1, 3, 5]}>
      <PurchaseReceiptsView />
    </ProtectedRoute>
  );
}
