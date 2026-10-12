import { ProtectedRoute } from "@/components/ProtectedRoute";
import PurchaseRequestsView from "@/components/purchase/PurchaseRequestsView";

export default function Page() {
  return (
    <ProtectedRoute allowedRoles={[1, 5]}>
      <PurchaseRequestsView />
    </ProtectedRoute>
  );
}
