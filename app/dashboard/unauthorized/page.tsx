'use client';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

export default function UnauthorizedPage() {
  const { user } = useAuth();

  const getRoleName = (rol: number) => {
    switch (rol) {
      case 1: return 'Administrador';
      case 2: return 'Supervisor';
      case 3: return 'Empleado';
      default: return 'Usuario';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-96">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Acceso Denegado
        </h1>
        <p className="text-xl text-gray-600 mb-6">
          No tienes permisos para acceder a esta página
        </p>
        {user && (
          <p className="text-lg text-gray-500 mb-8">
            Tu rol actual: <span className="font-semibold">{getRoleName(user.rol)}</span>
          </p>
        )}
        <Link
          href="/dashboard"
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}