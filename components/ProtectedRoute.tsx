"use client";
import { ReactNode } from "react";

import { useRoleAccess } from "@/hooks/useRoleAccess";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: number[];
  fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  fallback = (
    <div className="flex justify-center items-center h-64">
      <div className="text-gray-500">Verificando permisos...</div>
    </div>
  ),
}) => {
  const { hasAccess, isLoading } = useRoleAccess(allowedRoles);

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
