import { ProtectedRoute } from "@/components/ProtectedRoute";
import StockExtractionView from "@/components/stock/StockExtractionView";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default function StockExtractionPage() {
  return (
    <ProtectedRoute allowedRoles={[1, 3, 5]}>
      <div className="p-4 md:p-8 space-y-5">
        <Breadcrumbs
          items={[
            { label: "Compras" },
            { label: "Productos en estante", href: "/Dashboard/Purchase/Shelf" },
            { label: "Extraer del almacén" },
          ]}
        />
        <div>
          <h1 className="text-2xl font-bold leading-tight">Extraer del almacén</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Pasa productos del almacén al estante para dejarlos listos a la venta. Los que vencen primero aparecen arriba.
          </p>
        </div>
        <StockExtractionView />
      </div>
    </ProtectedRoute>
  );
}
