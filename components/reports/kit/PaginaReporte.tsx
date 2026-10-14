"use client";
import { Spinner } from "@heroui/react";
import React from "react";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import ReportHeader, { ReportRange } from "@/components/reports/ReportHeader";

type Props = {
  roles: number[];
  crumb: string;
  titulo: string;
  pregunta: string;
  /** Sin rango: el reporte es una foto de hoy */
  rango?: ReportRange;
  onRango?: (r: ReportRange) => void;
  notaSinRango?: string;
  cargando: boolean;
  error: string | null;
  /** true cuando ya hay datos que mostrar */
  listo: boolean;
  children: React.ReactNode;
};

/** Marco común de los reportes: acceso por rol, encabezado con fechas, carga y errores */
export default function PaginaReporte({ roles, crumb, titulo, pregunta, rango, onRango, notaSinRango, cargando, error, listo, children }: Props) {
  return (
    <ProtectedRoute allowedRoles={roles}>
      <div className="p-4 md:p-8 space-y-5">
        <ReportHeader
          crumb={crumb}
          question={pregunta}
          range={rango}
          snapshotNote={notaSinRango}
          title={titulo}
          onRangeChange={onRango}
        />

        {error && <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 text-sm p-4">{error}</div>}

        {cargando && !listo ? (
          <div className="flex justify-center py-24">
            <Spinner label="Calculando..." size="lg" />
          </div>
        ) : (
          listo && (
            <div className={`space-y-5 mt-4 transition-opacity ${cargando ? "opacity-50" : ""}`}>
              {children}
            </div>
          )
        )}
      </div>
    </ProtectedRoute>
  );
}
