import MovimientosAlmacenChart from "@/components/dashboard/MovimientosAlmacenChart";
import ProductosVencerTable from "@/components/dashboard/ProductosVencerTable";
import StockCriticoChart from "@/components/dashboard/StockCriticoChart";
import TopProductosChart from "@/components/dashboard/TopProductosChart";
import VentasCategoriaChart from "@/components/dashboard/VentasCategoriaChart";
import VentasMensualesChart from "@/components/dashboard/VentasMensualesChart";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function page() {
  return (
    <ProtectedRoute allowedRoles={[1, 2, 3, 4, 5]}>
      HOLA
    </ProtectedRoute>
  );
}
