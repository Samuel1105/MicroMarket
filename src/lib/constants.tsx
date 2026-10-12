// src/lib/constants.ts
import { Icon } from "@iconify/react";

import { SideNavItem } from "@/src/types";

export const SIDENAV_ITEMS: SideNavItem[] = [
  {
    title: "Dashboard",
    path: "/Dashboard",
    icon: <Icon height="24" icon="lucide:home" width="24" />,
    roles: [1, 2, 3, 4, 5], // Todos los roles
  },
  // {
  //   title: 'Almacén',
  //   path: '/dashboard/almacen',
  //   icon: <Icon icon="lucide:warehouse" width="24" height="24" />,
  //   submenu: true,
  //   subMenuItems: [
  //     { title: 'Ingreso', path: '/dashboard/almacen/ingreso', roles: [1, 2, 3] },
  //     { title: 'Historial', path: '/dashboard/almacen/historial', roles: [1, 2] },
  //     { title: 'Inventario', path: '/dashboard/almacen/inventario', roles: [1, 2] },
  //   ],
  //   roles: [1, 2, 3],
  // },
  {
    title: "Productos",
    path: "/dashboard/productos",
    icon: <Icon height="24" icon="lucide:shopping-bag" width="24" />,
    submenu: true,
    subMenuItems: [
      {
        title: "Categorías",
        path: "/Dashboard/Product/Category/List",
        roles: [1, 3],
      },
      { title: "Productos", path: "/Dashboard/Product/List", roles: [1, 3] },
    ],
    roles: [1, 3], // Solo admin y almacen
  },
  {
    title: 'Ventas',
    path: '/dashboard/ventas',
    icon: <Icon icon="lucide:shopping-cart" width="24" height="24" />,
    submenu: true,
    subMenuItems: [
      { title: 'Punto de Venta', path: '/Dashboard/Sales/New', roles: [1, 2] },
      { title: 'Historial de Ventas', path: '/Dashboard/Sales/History', roles: [1, 2, 3] },
    ],
    roles: [1, 2, 3], // Admin, cajero y almacen (almacen solo ve el historial)
  },
  {
    title: "Compras",
    path: "/dashboard/compras",
    icon: <Icon height="24" icon="lucide:package" width="24" />,
    submenu: true,
    subMenuItems: [
      {
        title: "Historial de Compras",
        path: "/Dashboard/Purchase/List",
        roles: [1, 3, 5],
      },
      {
        title: "Solicitudes de Compra",
        path: "/Dashboard/Purchase/Requests",
        roles: [1, 5],
      },
      {
        title: "Productos en Estante",
        path: "/Dashboard/Purchase/Shelf",
        roles: [1, 3, 5],
      },
      {
        title: "Extraer del Almacén",
        path: "/Dashboard/Purchase/Stock",
        roles: [1, 3, 5],
      },
    ],
    roles: [1, 3, 5], // Admin, compras y almacen (almacen solo ve el historial)
  },
  {
    title: "Inventario",
    path: "/Dashboard/Inventory",
    icon: <Icon height="24" icon="lucide:boxes" width="24" />,
    submenu: true,
    subMenuItems: [
      {
        title: "Movimientos",
        path: "/Dashboard/Inventory/Movements",
        roles: [1, 3, 5],
      },
    ],
    roles: [1, 3, 5],
  },

  {
    title: "Contactos",
    path: "/Contact/List",
    icon: <Icon height="24" icon="lucide:user-check" width="24" />,
    submenu: true,
    subMenuItems: [
      {
        title: "Clientes",
        path: "/Dashboard/Contact/Customer/List",
        roles: [1,2],
      },
      {
        title: "Proveedores",
        path: "/Dashboard/Contact/Suppier/List",
        roles: [1,3,5],
      },
    ],
    roles: [1, 2,3,5], // Solo admin, cajero , almacen y compras 
  },
  {
    title: "Usuarios",
    path: "/User/List",
    icon: <Icon height="24" icon="lucide:users" width="24" />,
    roles: [1], // Solo admin
  },
  {
    title: 'Reportes',
    path: '/dashboard/reportes',
    icon: <Icon icon="lucide:bar-chart-2" width="24" height="24" />,
    submenu: true,
    subMenuItems: [
      { title: 'Estado Financiero', path: '/Dashboard/Reports/EstadoFinanciero', roles: [1, 4] },
      { title: 'Rentabilidad', path: '/Dashboard/Reports/Rentabilidad', roles: [1, 4] },
      { title: 'Evolución de ventas', path: '/Dashboard/Reports/EvolucionVentas', roles: [1, 4] },
      { title: 'Analisis de clientes', path: '/Dashboard/Reports/AnalisisClientes', roles: [1, 4] },
      { title: 'Ventas por producto', path: '/Dashboard/Reports/VentasPorProducto', roles: [1, 4] },
      { title: 'Almacén de productos', path: '/Dashboard/Reports/AlmacenProductos', roles: [1, 4] },
      { title: 'Movimiento de almacén', path: '/Dashboard/Reports/MovimientoAlmacen', roles: [1, 3, 4] },
      { title: 'Ventas por vendedor', path: '/Dashboard/Reports/VentasPorVendedor', roles: [1, 4] },
    ],
    roles: [1, 3, 4], // Admin y Gestor de Reportes (todos); Almacén solo ve movimiento de almacén
  },
  {
    title: "Configuración",
    path: "/dashboard/configuracion",
    icon: <Icon height="24" icon="lucide:settings" width="24" />,
    submenu: true,
    subMenuItems: [
      { title: "U. Medidas", path: "/Dashboard/Config/Unit/List", roles: [1] },
    ],
    roles: [1], // Solo admin
  },
];
