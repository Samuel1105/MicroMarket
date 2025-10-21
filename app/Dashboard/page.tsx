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
        <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Panel de control y análisis del micromercado</p>
        </div>

        {/* Grid de Gráficos */}
        <div className="space-y-6">
          {/* Sección de Ventas */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              {/* <BarChart3 className="text-blue-600" size={24} /> */}
              <h2 className="text-xl font-semibold text-gray-800">Ventas y Financiero</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <VentasMensualesChart />
              <VentasCategoriaChart />
            </div>

            <div className="grid grid-cols-1 gap-6">
              <TopProductosChart />
            </div>
          </section>

          {/* Sección de Inventario */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              {/* <Package className="text-purple-600" size={24} /> */}
              <h2 className="text-xl font-semibold text-gray-800">Inventario y Stock</h2>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <StockCriticoChart />
            </div>
          </section>

          {/* Sección de Alertas */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              {/* <AlertTriangle className="text-amber-600" size={24} /> */}
              <h2 className="text-xl font-semibold text-gray-800">Alertas y Vencimientos</h2>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <ProductosVencerTable />
            </div>
          </section>

          {/* Sección Operacional */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              {/* <BarChart3 className="text-green-600" size={24} /> */}
              <h2 className="text-xl font-semibold text-gray-800">Operaciones</h2>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <MovimientosAlmacenChart />
            </div>
          </section>
        </div>
      </div>
    </ProtectedRoute>
  );
}
