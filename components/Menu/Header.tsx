//Header
"use client";

import React from "react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "@heroui/react";
import Image from "next/image";

import NotificationBell from "@/components/notifications/NotificationBell";
import useScroll from "@/hooks/use-scroll";

const Header = () => {
  const scrolled = useScroll(5);
  const selectedLayout = useSelectedLayoutSegment();

  return (
    <header
      className={cn(
        `sticky top-0 z-30 w-full transition-all border-b border-zinc-200/80`,
        {
          "border-b border-zinc-200/80 bg-white/80 backdrop-blur-lg": scrolled,
          "border-b border-zinc-200/80 bg-white": selectedLayout,
        },
      )}
    >
      <div className="flex h-[52px] items-center justify-between px-4 bg-gradient-to-r from-primary-50/60 via-white to-white lg:bg-none">
        <div className="flex items-center space-x-3">
          <Link
            className="flex flex-row space-x-2 items-center justify-center lg:hidden"
            href="/"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white ring-1 ring-primary-100 shadow-sm overflow-hidden">
              <Image
                priority
                alt="Logo"
                height={24}
                src="/Image/logo.png"
                width={24}
              />
            </div>
            <span className="font-bold text-base bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              MicroMarket
            </span>
          </Link>
        </div>
        <div className="flex items-center ml-auto mr-14 lg:mr-0">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
};

export default Header;
