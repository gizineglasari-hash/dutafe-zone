import type { Metadata, Viewport } from "next";
import { Baloo_2, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import ServiceWorkerRegister from "@/components/fezone/service-worker-register";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "FE-ZONE — Duta Remaja Putri Bebas Anemia",
  description:
    "Kenali Anemia, Rutin Minum TTD, Jadi Inspirasi! Program gamifikasi edukasi gizi masyarakat untuk remaja putri bebas anemia.",
  keywords: ["FE-ZONE", "anemia", "TTD", "remaja putri", "Duta Fe-Zone", "Pejuang Fe-Zone", "kesehatan remaja"],
  // PWA: manifest + ikon — diperlukan agar bisa di-install ke Home
  // Screen HP dan menerima push notification pengingat TTD.
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FE-ZONE",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#e11d48",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${jakarta.variable} ${baloo.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
