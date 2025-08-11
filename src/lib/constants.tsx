// src/lib/constants.ts
import { Icon } from '@iconify/react';
import { SideNavItem } from '@/src/types';

export const SIDENAV_ITEMS: SideNavItem[] = [
  {
    title: 'Dashboard',
    path: '/Dashboard',
    icon: <Icon icon="lucide:home" width="24" height="24" />,
    roles: [1,2,3,4,5], // Todos los roles
  },
  {
    title: 'Almacén',
    path: '/dashboard/almacen',
    icon: <Icon icon="lucide:warehouse" width="24" height="24" />,
    submenu: true,
    subMenuItems: [
      { title: 'Ingreso', path: '/dashboard/almacen/ingreso', roles: [1, 2, 3] },
      { title: 'Historial', path: '/dashboard/almacen/historial', roles: [1, 2] },
      { title: 'Inventario', path: '/dashboard/almacen/inventario', roles: [1, 2] },
    ],
    roles: [1, 2, 3], 
  },
  {
    title: 'Productos',
    path: '/dashboard/productos',
    icon: <Icon icon="lucide:shopping-bag" width="24" height="24" />,
    submenu: true,
    subMenuItems: [
      { title: 'Catálogo', path: '/dashboard/productos/catalogo', roles: [1, 2, 3] },
      { title: 'Gestión', path: '/dashboard/productos/gestion', roles: [1, 2] },
      { title: 'Categorías', path: '/dashboard/productos/categorias', roles: [1, 2] },
    ],
    roles: [1, 2, 3], 
  },
  {
    title: 'Ventas',
    path: '/dashboard/ventas',
    icon: <Icon icon="lucide:shopping-cart" width="24" height="24" />,
    submenu: true,
    subMenuItems: [
      { title: 'Nueva Venta', path: '/dashboard/ventas/crear', roles: [1, 2, 3] },
      { title: 'Historial', path: '/dashboard/ventas/historial', roles: [1, 2] },
      { title: 'Facturas', path: '/dashboard/ventas/facturas', roles: [1, 2] },
    ],
    roles: [1, 2, 3],
  },
  {
    title: 'Compras',
    path: '/dashboard/compras',
    icon: <Icon icon="lucide:package" width="24" height="24" />,
    submenu: true,
    subMenuItems: [
      { title: 'Nueva Compra', path: '/dashboard/compras/crear', roles: [1, 2] },
      { title: 'Historial', path: '/dashboard/compras/historial', roles: [1, 2] },
      { title: 'Proveedores', path: '/dashboard/compras/proveedores', roles: [1, 2] },
    ],
    roles: [1, 2], // Solo admin y supervisor
  },
  {
    title: 'Reportes',
    path: '/dashboard/reportes',
    icon: <Icon icon="lucide:bar-chart-2" width="24" height="24" />,
    submenu: true,
    subMenuItems: [
      { title: 'Estado Financiero', path: '/dashboard/reportes/financiero', roles: [1] },
      { title: 'Rentabilidad', path: '/dashboard/reportes/rentabilidad', roles: [1] },
      { title: 'Ventas', path: '/dashboard/reportes/ventas', roles: [1, 2] },
      { title: 'Inventario', path: '/dashboard/reportes/inventario', roles: [1, 2] },
      { title: 'Empleados', path: '/dashboard/reportes/empleados', roles: [1, 2] },
    ],
    roles: [1, 2], // Solo admin y supervisor
  },
  {
    title: 'Contactos',
    path: '/Contact/List',
    icon: <Icon icon="lucide:user-check" width="24" height="24" />,
    submenu: true,
    subMenuItems: [
      { title: 'Clientes', path: '/Dashboard/Contact/Customer/List', roles: [1, 2, 3] },
      { title: 'Proveedores', path: '/Dashboard/Contact/Proveedores', roles: [1, 2] },
    ],
    roles: [1, 2, 3],
  },
  {
    title: 'Usuarios',
    path: '/User/List',
    icon: <Icon icon="lucide:users" width="24" height="24" />,
    roles: [1], // Solo admin
  },
  {
    title: 'Configuración',
    path: '/dashboard/configuracion',
    icon: <Icon icon="lucide:settings" width="24" height="24" />,
    submenu: true,
    subMenuItems: [
      { title: 'General', path: '/dashboard/configuracion/general', roles: [1] },
      { title: 'Empresa', path: '/dashboard/configuracion/empresa', roles: [1] },
      { title: 'Facturación', path: '/dashboard/configuracion/facturacion', roles: [1] },
    ],
    roles: [1], // Solo admin
  },
];