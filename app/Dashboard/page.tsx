"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import { useAuth } from "@/app/context/AuthContext";
import { getResumenDashboard, ResumenDashboard } from "@/actions/dashboard/dashboard-resumen-action";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import TopProductosChart from "@/components/dashboard/TopProductosChart";
import VentasMensualesChart from "@/components/dashboard/VentasMensualesChart";
import EstadoEstantePanel from "@/components/notifications/EstadoEstantePanel";
import TareasPanel from "@/components/notifications/TareasPanel";
import Kpi from "@/components/reports/Kpi";
import { bs, num, variacion } from "@/src/utils/report-format";

/** Quién ve qué: ventas para quien vende o revisa; inventario para quien maneja mercadería */
const VE_VENTAS = [1, 2, 4];
const VE_INVENTARIO = [1, 3, 5];

const ACCESOS: Array<{ rol: number[]; label: string; icon: string; href: string }> = [
  { rol: [1, 2], label: "Nueva venta", icon: "heroicons:shopping-cart", href: "/Dashboard/Sales/New" },
  { rol: [1, 3, 5], label: "Sacar producto al estante", icon: "heroicons:archive-box-arrow-down", href: "/Dashboard/Purchase/Stock" },
  { rol: [1, 5], label: "Nueva compra", icon: "heroicons:truck", href: "/Dashboard/Purchase/New" },
  { rol: [1, 3, 5], label: "Productos en estante", icon: "heroicons:squares-2x2", href: "/Dashboard/Purchase/Shelf" },
];

function saludo() {
  const h = new Date().getHours();

  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [resumen, setResumen] = useState<ResumenDashboard | null>(null);
  const rol = user?.rol ?? 0;

  useEffect(() => {
    getResumenDashboard().then(setResumen).catch(() => setResumen(null));
  }, []);

  const veVentas = VE_VENTAS.includes(rol);
  const veInventario = VE_INVENTARIO.includes(rol);
  const accesos = ACCESOS.filter((a) => a.rol.includes(rol));

  return (
    <ProtectedRoute allowedRoles={[1, 2, 3, 4, 5]}>
      <div className="p-4 md:p-8 space-y-5">
        <div>
          <h1 className="text-2xl font-bold leading-tight">
            {saludo()}
            {user ? `, ${user.primerNombre}` : ""}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Esto es lo que necesita tu atención hoy.</p>
        </div>

        {/* El cajero y el administrador vigilan el estante y avisan; Almacén y Compras reciben las tareas */}
        {[1, 2].includes(rol) && <EstadoEstantePanel />}

        <TareasPanel />

        {(veVentas || veInventario) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {veVentas && (
              <>
                <Kpi
                  definition="Total de ventas de hoy comparado con ayer completo."
                  delta={resumen ? variacion(resumen.ventasHoy.total, resumen.ventasAyer) : undefined}
                  hint={resumen ? `${num(resumen.ventasHoy.numero)} ventas hoy` : "Cargando…"}
                  icon="heroicons:banknotes"
                  label="Ventas de hoy"
                  value={resumen ? bs(resumen.ventasHoy.total) : "—"}
                />
                <Kpi
                  definition="Ventas del 1 del mes hasta hoy, comparadas con el mismo tramo del mes anterior."
                  delta={resumen ? variacion(resumen.mes.total, resumen.mes.anterior) : undefined}
                  hint="Del 1 hasta hoy"
                  icon="heroicons:calendar-days"
                  label="Ventas del mes"
                  tone="secondary"
                  value={resumen ? bs(resumen.mes.total) : "—"}
                />
              </>
            )}
            {veInventario && (
              <>
                <Kpi
                  definition="Productos agotados o por debajo de su stock mínimo (almacén + estante)."
                  hint={resumen?.inventario ? `${resumen.inventario.sinStock} agotados` : "Cargando…"}
                  icon="heroicons:arrow-trending-down"
                  label="Productos por reponer"
                  tone={resumen?.inventario?.porReponer ? "danger" : "success"}
                  value={resumen?.inventario ? String(resumen.inventario.porReponer) : "—"}
                />
                <Kpi
                  definition="Costo de la mercadería que vence en los próximos 30 días y aún no se vendió."
                  hint={
                    resumen?.inventario?.valorVencido
                      ? `Además hay ${bs(resumen.inventario.valorVencido, 0)} ya vencido`
                      : "Vence en 30 días o menos"
                  }
                  icon="heroicons:clock"
                  label="En riesgo de vencer"
                  tone={resumen?.inventario?.valorPorVencer ? "danger" : "success"}
                  value={resumen?.inventario ? bs(resumen.inventario.valorPorVencer) : "—"}
                />
              </>
            )}
          </div>
        )}

        {accesos.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {accesos.map((a) => (
              <Link
                key={a.href}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-default-200 shadow-sm text-sm font-medium text-gray-700 hover:border-primary-300 hover:text-primary-700 transition-colors"
                href={a.href}
              >
                <Icon height="18" icon={a.icon} width="18" />
                {a.label}
              </Link>
            ))}
          </div>
        )}

        {veVentas && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <VentasMensualesChart />
            <TopProductosChart />
          </div>
        )}

        {[1, 2, 3, 4, 5].includes(rol) && (
          <p className="text-xs text-gray-500">
            Para ver el detalle completo (por producto, cliente, almacén o empleado) entra al menú <b>Reportes</b>.
          </p>
        )}
      </div>
    </ProtectedRoute>
  );
}
