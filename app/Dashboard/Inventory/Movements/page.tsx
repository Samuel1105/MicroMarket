import InventoryMovementsView from "@/components/inventory/InventoryMovementsView";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function InventoryMovementsPage() {
  return (
    <ProtectedRoute allowedRoles={[1, 3, 5]}>
      <InventoryMovementsView />
    </ProtectedRoute>
  );
}
