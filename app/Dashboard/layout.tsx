'use client';
import SideNav from "@/components/Menu/Side-nav";
import MarginWidthWrapper from "@/components/Menu/margin-width-wrapper";
import Header from "@/components/Menu/Header";
import HeaderMobile from "@/components/Menu/HeaderMobile";
import PageWrapper from "@/components/Menu/page-wrapper";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";

export default function DashBoardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/');
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-gray-500">Cargando...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <>
            <div className="flex">
                <SideNav />
                <main className="flex-1">
                    <MarginWidthWrapper>
                        <Header />
                        <HeaderMobile />
                        <PageWrapper>
                            {children}
                        </PageWrapper>
                    </MarginWidthWrapper>
                </main>
            </div>
        </>
    );
}