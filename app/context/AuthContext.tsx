"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

interface User {
  id: number;
  primerNombre: string;
  segundoNombre?: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  correo: string;
  celular: number;
  rol: number;
  estado: number;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (allowedRoles: number[]) => boolean;
  getUserRole: () => number | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay un usuario guardado en localStorage
    const checkAuth = () => {
      const savedUser = localStorage.getItem("user");

      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);

          setUser(userData);
          setIsAuthenticated(true);
        } catch (error) {
          console.error("Error parsing user data:", error);
          logout();
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("user");
  };

  const hasRole = (allowedRoles: number[]): boolean => {
    if (!user) return false;

    return allowedRoles.includes(user.rol);
  };

  const getUserRole = (): number | null => {
    return user?.rol || null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated,
        hasRole,
        getUserRole,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
