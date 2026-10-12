import { ProtectedRoute } from "@/components/ProtectedRoute";
import SalesView from "@/components/sales/SalesView";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default function SalesPage() {
  return (
    <ProtectedRoute allowedRoles={[1, 2]}>
      <div className="p-4 md:p-8 space-y-5">
        <Breadcrumbs items={[{ label: "Ventas" }, { label: "Punto de venta" }]} />
        <div>
          <h1 className="text-2xl font-bold leading-tight">Punto de venta</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Escanea o elige los productos, revisa el carrito y cobra.
          </p>
        </div>
        <SalesView />
      </div>
    </ProtectedRoute>
  );
}
