import type { Metadata } from "next";
import { Sarabun } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// DESIGN.md: Sarabun is the primary UI font and covers Thai + Latin, so it's the
// only family we load. Geist/Geist Mono/Noto Sans Thai were create-next-app
// leftovers that only fattened the font payload (mono now falls back to the
// system monospace stack in globals.css). (T38)
// weights — caption 300, body 400, medium 500, heading 600.
const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
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
      className={`${sarabun.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
