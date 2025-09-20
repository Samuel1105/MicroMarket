import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/app/context/AuthContext";

export const useRoleAccess = (allowedRoles: number[]) => {
  const { hasRole, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push("/");

      return;
    }

    if (!hasRole(allowedRoles)) {
      router.push("/Dashboard/unauthorized");

      return;
    }
  }, [isAuthenticated, hasRole, allowedRoles, router, isLoading]);

  return {
    hasAccess: isAuthenticated && hasRole(allowedRoles),
    isAuthenticated,
    isLoading,
  };
};
