'use client';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { ReactNode } from 'react';

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
  )
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