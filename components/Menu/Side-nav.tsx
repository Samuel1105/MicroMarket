// components/Menu/Side-nav.tsx (Actualizado)
"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import Image from "next/image";

import { SIDENAV_ITEMS } from "@/src/lib/constants";
import { SideNavItem } from "@/src/types";
import { useAuth } from "@/app/context/AuthContext";
import { getRoleName } from "@/src/utils/rolesName";

const SideNav = () => {
  const { hasRole, user } = useAuth();

  // Filtrar elementos del menú basado en el rol del usuario
  const filteredItems = SIDENAV_ITEMS.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;

    return hasRole(item.roles);
  });

  return (
    <aside className="lg:w-64 bg-white h-screen fixed border-r border-zinc-200/80 hidden lg:flex lg:flex-col shadow-[1px_0_12px_rgba(0,0,0,0.03)]">
      <div className="flex flex-col h-full">
        <Link
          aria-label="Dashboard"
          className="group flex flex-row space-x-3 items-center justify-center lg:justify-start lg:px-5 h-16 w-full flex-shrink-0 bg-gradient-to-r from-primary-50 via-white to-white border-b border-zinc-200/80"
          href="/Dashboard"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white ring-1 ring-primary-100 shadow-sm overflow-hidden shrink-0">
            <Image
              priority
              alt="Logo"
              height={28}
              src="/Image/logo.png"
              width={28}
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-extrabold text-lg bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              MicroMarket
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">
              Gestión de mercado
            </span>
          </div>
        </Link>

        {/* Información del usuario */}
        <div className="px-4 py-4 border-b border-zinc-200/80">
          <div className="flex items-center space-x-3 bg-zinc-50 rounded-xl px-3 py-2.5 ring-1 ring-zinc-200/60">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white text-sm font-bold">
                {user?.primerNombre?.charAt(0) || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.primerNombre} {user?.apellidoPaterno}
              </p>
              <p className="text-xs text-secondary-700 font-medium truncate">
                {getRoleName(user?.rol ?? 2)}
              </p>
            </div>
          </div>
        </div>

        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto">
          <div className="flex flex-col space-y-1 lg:px-3 py-4">
            <span className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Menú principal
            </span>
            {filteredItems.map((item, idx) => (
              <MenuItem key={`${item.title}-${idx}`} item={item} />
            ))}
          </div>
        </nav>

        {/* Logout button */}
        <div className="px-3 py-4 border-t border-zinc-200/80">
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
};

interface MenuItemProps {
  item: SideNavItem;
}

const MenuItem = ({ item }: MenuItemProps) => {
  const pathname = usePathname();
  const hasActiveChild =
    item.subMenuItems?.some((sub) => pathname.startsWith(sub.path)) ?? false;
  const [subMenuOpen, setSubMenuOpen] = useState(hasActiveChild);
  const { hasRole } = useAuth();

  const toggleSubMenu = () => setSubMenuOpen(!subMenuOpen);

  // Filtrar subelementos basado en roles si los tienen
  const filteredSubItems = item.subMenuItems?.filter((subItem) => {
    if (!subItem.roles || subItem.roles.length === 0) return true;

    return hasRole(subItem.roles);
  });

  const isActive = item.submenu ? hasActiveChild : pathname.includes(item.path);

  return (
    <div className="space-y-0.5">
      {item.submenu ? (
        <>
          <button
            aria-controls={`submenu-${item.title}`}
            aria-expanded={subMenuOpen}
            className={`group flex flex-row items-center p-2.5 rounded-xl w-full justify-between transition-all duration-200 ${
              isActive
                ? "bg-primary-50 text-primary-700"
                : "text-zinc-600 hover:bg-secondary-50 hover:text-secondary-700"
            }`}
            onClick={toggleSubMenu}
          >
            <div className="flex flex-row space-x-3 items-center">
              <span
                className={`flex items-center justify-center transition-colors ${
                  isActive
                    ? "text-primary-600"
                    : "text-zinc-400 group-hover:text-secondary-600"
                }`}
              >
                {item.icon}
              </span>
              <span className="font-medium text-[15px]">{item.title}</span>
            </div>
            <div
              className={`transition-transform duration-200 text-zinc-400 ${subMenuOpen ? "rotate-180" : ""}`}
            >
              <Icon height="18" icon="lucide:chevron-down" width="18" />
            </div>
          </button>
          {subMenuOpen && filteredSubItems && filteredSubItems.length > 0 && (
            <div
              className="my-1 ml-5 flex flex-col space-y-0.5 border-l-2 border-zinc-100 pl-4"
              id={`submenu-${item.title}`}
            >
              {filteredSubItems.map((subItem, idx) => (
                <Link
                  key={`${subItem.title}-${idx}`}
                  className={`px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                    pathname.startsWith(subItem.path)
                      ? "font-semibold text-primary-700 bg-primary-50"
                      : "text-zinc-500 hover:bg-secondary-50 hover:text-secondary-700"
                  }`}
                  href={subItem.path}
                >
                  {subItem.title}
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <Link
          className={`group flex flex-row space-x-3 items-center p-2.5 rounded-xl transition-all duration-200 ${
            item.path === pathname
              ? "bg-primary-50 text-primary-700 font-semibold"
              : "text-zinc-600 hover:bg-secondary-50 hover:text-secondary-700"
          }`}
          href={item.path}
        >
          <span
            className={`flex items-center justify-center transition-colors ${
              item.path === pathname
                ? "text-primary-600"
                : "text-zinc-400 group-hover:text-secondary-600"
            }`}
          >
            {item.icon}
          </span>
          <span className="font-medium text-[15px]">{item.title}</span>
        </Link>
      )}
    </div>
  );
};

const LogoutButton = () => {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <button
      className="flex flex-row space-x-3 items-center p-2.5 rounded-xl hover:bg-red-50 transition-colors w-full text-zinc-500 hover:text-red-600"
      onClick={handleLogout}
    >
      <Icon height="20" icon="lucide:log-out" width="20" />
      <span className="font-medium text-[15px]">Cerrar Sesión</span>
    </button>
  );
};

export default SideNav;
