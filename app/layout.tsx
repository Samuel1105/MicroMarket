import type { Metadata } from "next";

import localFont from "next/font/local";
import "@/styles/globals.css";
import { ToastContainer } from "react-toastify";

import { AuthProvider } from "@/app/context/AuthContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "MicroMarket - Sistema de Gestión",
  description: "Sistema de gestión para micromarket",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {
          <AuthProvider>
            {children}
            <ToastContainer pauseOnFocusLoss={false} />
          </AuthProvider>
        }
      </body>
    </html>
  );
}
