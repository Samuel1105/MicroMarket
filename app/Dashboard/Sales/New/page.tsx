import { ProtectedRoute } from "@/components/ProtectedRoute";
import SalesView from "@/components/sales/SalesView";
import Heading from "@/components/ui/Heading";

export default function SalesPage() {
  return (
    <ProtectedRoute allowedRoles={[1, 2]}>
      <div className="w-full">
        <Heading>Punto de Venta</Heading>
        <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="w-full pt-5">
            <SalesView />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}