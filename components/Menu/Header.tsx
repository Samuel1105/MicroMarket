//Header
'use client';

import React from 'react';

import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';

import useScroll from '@/hooks/use-scroll';
import { cn } from '@heroui/react';
import Image from 'next/image';

const Header = () => {
    const scrolled = useScroll(5);
    const selectedLayout = useSelectedLayoutSegment();

    return (
        <header
            className={cn(
                `sticky top-0 z-30 w-full transition-all border-b border-gray-200`,
                {
                    'border-b border-gray-200 bg-white/75 backdrop-blur-lg': scrolled,
                    'border-b border-gray-200 bg-white': selectedLayout,
                },
            )}
        >
            <div className="flex h-[47px] items-center justify-between px-4">
                <div className="flex items-center space-x-4">
                    <Link
                        href="/"
                        className="flex flex-row space-x-3 items-center justify-center lg:hidden"
                    >
                        <Image
                            src="/Image/logo.png"
                            width={50}
                            height={50}
                            alt="Logo"
                            priority
                        />
                    </Link>
                </div>
            </div>
        </header>
    );
};

export default Header;