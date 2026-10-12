import { Suspense } from "react";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import NewPurchaseView from "@/components/purchase/NewPurchaseView";

export default function Page() {
  return (
    <ProtectedRoute allowedRoles={[1, 5]}>
      <Suspense fallback={null}>
        <NewPurchaseView />
      </Suspense>
    </ProtectedRoute>
  );
}
