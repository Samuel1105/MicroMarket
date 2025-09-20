export function getRoleName(roleId: number): string {
  const roles: Record<number, string> = {
    1: "Administrador",
    2: "Usuario",
    3: "Almacen",
    4: "Reportes",
    5: "Compras",
  };

  return roles[roleId] || `Rol ${roleId}`;
}
