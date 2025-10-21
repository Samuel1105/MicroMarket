import { ProtectedRoute } from "@/components/ProtectedRoute";
import StockExtractionView from "@/components/stock/StockExtractionView";

import Heading from "@/components/ui/Heading";

export default function StockExtractionPage() {
  return (
    <ProtectedRoute allowedRoles={[1, 5]}>
      <div className="w-full">
        <Heading>Extraer Stock para Venta</Heading>
        <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="w-full pt-5">
            <StockExtractionView />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}