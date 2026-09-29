import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { QueryProvider } from "@/providers/query-provider";
import { ToastProvider } from "@/components/ui/toast-provider";
import { ThemeHydration } from "@/components/theme-hydration";
import dynamic from "next/dynamic";
import "./globals.css";

const MobileBottomNav = dynamic(
  () => import("@/components/layout/mobile-bottom-nav").then((m) => m.MobileBottomNav),
  { ssr: false }
);

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Velmora Kids — Премиальная детская одежда",
    template: "%s | Velmora Kids",
  },
  description:
    "Velmora Kids — интернет-магазин премиальной детской одежды. Стильная и качественная одежда для девочек, мальчиков и новорожденных. Бесплатная доставка по Ташкенту.",
  keywords: [
    "детская одежда",
    "премиум",
    "Ташкент",
    "Узбекистан",
    "одежда для девочек",
    "одежда для мальчиков",
    "новорожденные",
    "Velmora Kids",
  ],
  openGraph: {
    title: "Velmora Kids — Премиальная детская одежда",
    description:
      "Стильная и качественная одежда для детей. Натуральные ткани, изысканный дизайн.",
    type: "website",
    locale: "ru_RU",
    siteName: "Velmora Kids",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="min-h-screen bg-white font-sans antialiased dark:bg-neutral-950 dark:text-neutral-100 transition-colors duration-300">
        <QueryProvider>
          <ThemeHydration />
          <div className="pb-16 lg:pb-0">
            {children}
          </div>
          <MobileBottomNav />
          <ToastProvider />
        </QueryProvider>
      </body>
    </html>
  );
}
