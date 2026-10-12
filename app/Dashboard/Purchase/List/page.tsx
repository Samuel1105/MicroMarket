import { ProtectedRoute } from "@/components/ProtectedRoute";
import PurchaseHistoryView from "@/components/purchase/PurchaseHistoryView";

export default function page() {
  return (
    <ProtectedRoute allowedRoles={[1, 3, 5]}>
      <PurchaseHistoryView />
    </ProtectedRoute>
  );
}
