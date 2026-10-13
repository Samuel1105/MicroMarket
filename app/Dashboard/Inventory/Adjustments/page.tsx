import InventoryAdjustmentView from "@/components/inventory/InventoryAdjustmentView";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function InventoryAdjustmentsPage() {
  return (
    <ProtectedRoute allowedRoles={[1, 3]}>
      <InventoryAdjustmentView />
    </ProtectedRoute>
  );
}
