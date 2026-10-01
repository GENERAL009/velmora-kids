"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useLanguageStore } from "@/store/language";

/** Public site settings managed in Admin → Sozlamalar (GET /settings/site). */
export interface SiteSettings {
  phone_primary?: string;
  phone_secondary?: string;
  email?: string;
  instagram_url?: string;
  telegram_url?: string;
  facebook_url?: string;
  tiktok_url?: string;
  address?: string;
  address_uz?: string;
  working_hours?: string;
  working_hours_uz?: string;
  footer_about?: string;
  footer_about_uz?: string;
  logo_header?: string;
  logo_footer?: string;
  logo_favicon?: string;
  [key: string]: unknown;
}

/** Shared by header, footer, hero, checkout… — one request thanks to the common query key. */
export function useSiteSettings() {
  const locale = useLanguageStore((s) => s.locale);
  const query = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => apiGet<SiteSettings>("/settings/site"),
    staleTime: 5 * 60 * 1000,
  });
  const data = query.data;

  /** Text in the current language: Uzbek uses `<key>_uz`, falling back to the base (Russian) value. */
  const text = (key: "address" | "working_hours" | "footer_about"): string => {
    const ru = (data?.[key] as string | undefined)?.trim() || "";
    const uz = (data?.[`${key}_uz`] as string | undefined)?.trim() || "";
    return locale === "uz" ? uz || ru : ru || uz;
  };

  return { settings: data, isLoading: query.isLoading, text };
}

/** Only allow web links in admin-entered URLs (no javascript: etc.). */
export function safeHref(url?: string | null): string | null {
  const u = (url || "").trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(u)) return `https://${u}`; // "t.me/shop" → https://t.me/shop
  return null;
}

/** "+998 71 200 00 00" → "tel:+998712000000" */
export function telHref(phone?: string | null): string | null {
  const digits = (phone || "").replace(/[^\d+]/g, "");
  return digits.length >= 7 ? `tel:${digits}` : null;
}
