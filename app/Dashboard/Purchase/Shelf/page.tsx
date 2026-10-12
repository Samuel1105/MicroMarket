import { ProtectedRoute } from "@/components/ProtectedRoute";
import ShelfStockView from "@/components/stock/ShelfStockView";

export default function ShelfPage() {
  return (
    <ProtectedRoute allowedRoles={[1, 3, 5]}>
      <ShelfStockView />
    </ProtectedRoute>
  );
}
