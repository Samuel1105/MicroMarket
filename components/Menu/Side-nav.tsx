// components/Menu/Side-nav.tsx (Actualizado)
'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SIDENAV_ITEMS } from '@/src/lib/constants';
import { Icon } from '@iconify/react';
import { SideNavItem } from '@/src/types';
import Image from 'next/image';
import { useAuth } from '@/app/context/AuthContext';
import { getRoleName } from '@/src/utils/rolesName';

const SideNav = () => {
  const { hasRole, user } = useAuth();

  // Filtrar elementos del menú basado en el rol del usuario
  const filteredItems = SIDENAV_ITEMS.filter(item => {
    if (!item.roles || item.roles.length === 0) return true;
    return hasRole(item.roles);
  });

  return (
    <aside className="lg:w-60 bg-white h-screen fixed border-r border-zinc-200 hidden lg:block">
      <div className="flex flex-col h-full">
        <Link
          href="/Dashboard"
          className="flex flex-row space-x-3 items-center justify-center lg:justify-start lg:px-6 border-b border-zinc-200 h-12 w-full flex-shrink-0"
          aria-label="Dashboard"
        >
          <Image
            src="/Image/logo.png"
            width={50}
            height={50}
            alt="Logo"
            priority
          />
          <span className="font-bold text-lg text-gray-800">MicroMarket</span>
        </Link>
        
        {/* Información del usuario */}
        <div className="px-6 py-4 border-b border-zinc-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {user?.primerNombre?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.primerNombre} {user?.apellidoPaterno}
              </p>
              <p className="text-xs text-gray-500">
                {getRoleName(user?.rol ?? 2)}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto" aria-label="Main navigation">
          <div className="flex flex-col space-y-2 lg:px-6 py-4">
            {filteredItems.map((item, idx) => (
              <MenuItem key={`${item.title}-${idx}`} item={item} />
            ))}
          </div>
        </nav>

        {/* Logout button */}
        <div className="px-6 py-4 border-t border-zinc-200">
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
  const [subMenuOpen, setSubMenuOpen] = useState(false);
  const { hasRole } = useAuth();

  const toggleSubMenu = () => setSubMenuOpen(!subMenuOpen);

  // Filtrar subelementos basado en roles si los tienen
  const filteredSubItems = item.subMenuItems?.filter(subItem => {
    if (!subItem.roles || subItem.roles.length === 0) return true;
    return hasRole(subItem.roles);
  });

  return (
    <div className="space-y-1">
      {item.submenu ? (
        <>
          <button
            onClick={toggleSubMenu}
            className={`flex flex-row items-center p-2 rounded-lg w-full justify-between hover:bg-zinc-100 transition-colors ${
              pathname.includes(item.path) ? 'bg-zinc-100' : ''
            }`}
            aria-expanded={subMenuOpen}
            aria-controls={`submenu-${item.title}`}
          >
            <div className="flex flex-row space-x-4 items-center">
              {item.icon}
              <span className="font-semibold text-xl">{item.title}</span>
            </div>
            <div className={`transition-transform ${subMenuOpen ? 'rotate-180' : ''}`}>
              <Icon icon="lucide:chevron-down" width="24" height="24" />
            </div>
          </button>
          {subMenuOpen && filteredSubItems && filteredSubItems.length > 0 && (
            <div
              id={`submenu-${item.title}`}
              className="my-2 ml-12 flex flex-col space-y-2"
            >
              {filteredSubItems.map((subItem, idx) => (
                <Link
                  key={`${subItem.title}-${idx}`}
                  href={subItem.path}
                  className={`px-2 py-1 rounded hover:bg-zinc-100 transition-colors ${
                    subItem.path === pathname ? 'font-bold text-blue-600' : ''
                  }`}
                >
                  {subItem.title}
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <Link
          href={item.path}
          className={`flex flex-row space-x-4 items-center p-2 rounded-lg hover:bg-zinc-100 transition-colors ${
            item.path === pathname ? 'bg-zinc-100 font-semibold' : ''
          }`}
        >
          {item.icon}
          <span className="font-semibold text-xl">{item.title}</span>
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
    router.push('/');
  };

  return (
    <button
      onClick={handleLogout}
      className="flex flex-row space-x-4 items-center p-2 rounded-lg hover:bg-red-50 transition-colors w-full text-red-600 hover:text-red-700"
    >
      <Icon icon="lucide:log-out" width="24" height="24" />
      <span className="font-semibold text-xl">Cerrar Sesión</span>
    </button>
  );
};

export default SideNav;