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

const DEFAULT_METADATA: Metadata = {
  title: {
    default: "Velmora Kids — коляски, велосипеды, самокаты и электромобили для детей",
    template: "%s | Velmora Kids",
  },
  description:
    "Velmora Kids — интернет-магазин детского транспорта в Узбекистане: коляски, велосипеды, беговелы, самокаты и детские электромобили. Bolalar kolyaskalari, velosipedlari, samokatlari va elektromobillari.",
  keywords: [
    "детские коляски",
    "детские велосипеды",
    "беговелы",
    "детские самокаты",
    "детские электромобили",
    "bolalar kolyaskasi",
    "bolalar velosipedi",
    "samokat",
    "bolalar mashinasi",
    "Ташкент",
    "Узбекистан",
    "Velmora Kids",
  ],
  openGraph: {
    title: "Velmora Kids — детский транспорт",
    description:
      "Коляски, велосипеды, самокаты и детские электромобили с доставкой по Узбекистану.",
    type: "website",
    locale: "ru_RU",
    siteName: "Velmora Kids",
  },
};

/** SEO title/description and favicon come from Admin → Sozlamalar (SEO, Logotiplar). */
export async function generateMetadata(): Promise<Metadata> {
  let s: { meta_title?: string; meta_description?: string; logo_favicon?: string } = {};
  try {
    const res = await fetch(`${process.env.BACKEND_URL || "http://127.0.0.1:8000"}/api/v1/settings/site`, {
      cache: "no-store", // admin changes must show up right away (cheap: a small JSON read)
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) s = await res.json();
  } catch {
    // backend unreachable (e.g. during build) — keep the defaults
  }
  const title = s.meta_title?.trim();
  const description = s.meta_description?.trim();
  return {
    ...DEFAULT_METADATA,
    title: title ? { default: title, template: "%s | Velmora Kids" } : DEFAULT_METADATA.title,
    description: description || DEFAULT_METADATA.description,
    openGraph: {
      ...DEFAULT_METADATA.openGraph,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
    },
    icons: { icon: s.logo_favicon?.trim() || "/favicon.ico" },
  };
}

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
