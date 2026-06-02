import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Thai, Sarabun } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// DESIGN.md: Sarabun is the primary UI font (Thai + Latin).
// weights — caption 300, body 400, medium 500, heading 600.
const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai"],
});

export const metadata: Metadata = {
  title: "orderman",
  description: "ระบบจดออเดอร์และสรุปยอดขายสำหรับร้านอาหาร",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${sarabun.variable} ${geistSans.variable} ${geistMono.variable} ${notoSansThai.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
