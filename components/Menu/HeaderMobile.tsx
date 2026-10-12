"use client";

import React, { ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { motion, useCycle } from "framer-motion";

import { SIDENAV_ITEMS } from "@/src/lib/constants";
import { SideNavItem } from "@/src/types";

type MenuItemWithSubMenuProps = {
  item: SideNavItem;
  toggleOpen: () => void;
};

const sidebar = {
  open: {
    clipPath: "circle(2200px at 100% 0)",
    transition: {
      type: "spring" as const,
      stiffness: 20,
      restDelta: 2,
    },
  },
  closed: {
    clipPath: "circle(0px at 100% 0)",
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 40,
    },
  },
};

const HeaderMobile = () => {
  const pathname = usePathname();
  const containerRef = useRef(null);
  const [isOpen, toggleOpen] = useCycle(false, true);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  return (
    <motion.nav
      ref={containerRef}
      animate={isOpen ? "open" : "closed"}
      className={`fixed inset-0 z-50 w-full lg:hidden ${
        isOpen ? "" : "pointer-events-none"
      }`}
      initial={false}
    >
      <motion.div
        className="absolute inset-0 right-0 w-full bg-gradient-to-b from-primary-50 via-white to-white"
        variants={sidebar}
      />
      <motion.ul
        className={`absolute grid w-full gap-2 px-8 py-20 ${
          isOpen
            ? "overflow-y-auto max-h-[calc(100vh-4rem)]"
            : "overflow-hidden"
        }`}
        variants={variants}
      >
        {SIDENAV_ITEMS.map((item, idx) => {
          return (
            <div key={idx}>
              {item.submenu ? (
                <MenuItemWithSubMenu item={item} toggleOpen={toggleOpen} />
              ) : (
                <MenuItem>
                  <Link
                    className={`flex items-center gap-3 w-full text-lg px-3 py-2.5 rounded-xl transition-colors ${
                      item.path === pathname
                        ? "bg-primary-50 text-primary-700 font-semibold"
                        : "text-zinc-600"
                    }`}
                    href={item.path}
                    onClick={() => toggleOpen()}
                  >
                    <span
                      className={
                        item.path === pathname
                          ? "text-primary-600"
                          : "text-zinc-400"
                      }
                    >
                      {item.icon}
                    </span>
                    {item.title}
                  </Link>
                </MenuItem>
              )}
            </div>
          );
        })}
      </motion.ul>
      <MenuToggle toggle={toggleOpen} isOpen={isOpen} />
    </motion.nav>
  );
};

const MenuToggle = ({
  toggle,
  isOpen,
}: {
  toggle: () => void;
  isOpen: boolean;
}) => (
  <button
    aria-label="Toggle menu"
    className={`pointer-events-auto absolute right-4 top-[14px] z-30 flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
      isOpen ? "bg-primary-100" : "bg-zinc-100"
    }`}
    onClick={toggle}
  >
    <svg height="18" viewBox="0 0 23 23" width="18">
      <Path
        variants={{
          closed: { d: "M 2 2.5 L 20 2.5" },
          open: { d: "M 3 16.5 L 17 2.5" },
        }}
      />
      <Path
        d="M 2 9.423 L 20 9.423"
        transition={{ duration: 0.1 }}
        variants={{
          closed: { opacity: 1 },
          open: { opacity: 0 },
        }}
      />
      <Path
        variants={{
          closed: { d: "M 2 16.346 L 20 16.346" },
          open: { d: "M 3 2.5 L 17 16.346" },
        }}
      />
    </svg>
  </button>
);

const Path = (props: any) => (
  <motion.path
    fill="transparent"
    stroke="#ea580c"
    strokeLinecap="round"
    strokeWidth="2"
    {...props}
  />
);

const MenuItem = ({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) => {
  return (
    <motion.li className={className} variants={MenuItemVariants}>
      {children}
    </motion.li>
  );
};

const MenuItemWithSubMenu: React.FC<MenuItemWithSubMenuProps> = ({
  item,
  toggleOpen,
}) => {
  const pathname = usePathname();
  const [subMenuOpen, setSubMenuOpen] = useState(false);

  const isActive = pathname.includes(item.path);

  return (
    <>
      <MenuItem>
        <button
          aria-expanded={subMenuOpen}
          className={`flex w-full text-lg items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
            isActive ? "bg-primary-50 text-primary-700 font-semibold" : "text-zinc-600"
          }`}
          onClick={() => setSubMenuOpen(!subMenuOpen)}
        >
          <div className="flex flex-row justify-between w-full items-center">
            <span className="flex items-center gap-3">
              <span className={isActive ? "text-primary-600" : "text-zinc-400"}>
                {item.icon}
              </span>
              {item.title}
            </span>
            <div
              className={`text-zinc-400 transition-transform ${subMenuOpen ? "rotate-180" : ""}`}
            >
              <Icon height="20" icon="lucide:chevron-down" width="20" />
            </div>
          </div>
        </button>
      </MenuItem>
      <div className="mt-1 ml-9 flex flex-col space-y-1 border-l-2 border-zinc-100 pl-4">
        {subMenuOpen && (
          <>
            {item.subMenuItems?.map((subItem, subIdx) => {
              return (
                <MenuItem key={subIdx}>
                  <Link
                    className={`block text-base px-2 py-1.5 rounded-lg transition-colors ${
                      subItem.path === pathname
                        ? "font-semibold text-primary-700 bg-primary-50"
                        : "text-zinc-500"
                    }`}
                    href={subItem.path}
                    onClick={() => toggleOpen()}
                  >
                    {subItem.title}
                  </Link>
                </MenuItem>
              );
            })}
          </>
        )}
      </div>
    </>
  );
};

const MenuItemVariants = {
  open: {
    y: 0,
    opacity: 1,
    transition: {
      y: { stiffness: 1000, velocity: -100 },
    },
  },
  closed: {
    y: 50,
    opacity: 0,
    transition: {
      y: { stiffness: 1000 },
      duration: 0.02,
    },
  },
};

const variants = {
  open: {
    transition: { staggerChildren: 0.05, delayChildren: 0.15 },
  },
  closed: {
    transition: { staggerChildren: 0.01, staggerDirection: -1 },
  },
};

export default HeaderMobile;
