"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Truck, RotateCcw, Shield, Gift, Clock, Award, CreditCard, Phone, Star, Heart,
  type LucideIcon,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { useTranslation } from "@/hooks/use-translation";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";

export interface TrustBadge {
  icon: string;
  title_uz: string;
  title_ru: string;
  enabled: boolean;
}

/** Icon names the admin can pick — must match TRUST_ICONS in backend settings.py */
export const TRUST_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  truck: { icon: Truck, label: "Yetkazish" },
  rotate: { icon: RotateCcw, label: "Qaytarish" },
  shield: { icon: Shield, label: "Kafolat" },
  gift: { icon: Gift, label: "Sovg'a" },
  clock: { icon: Clock, label: "Tezkor" },
  award: { icon: Award, label: "Sifat" },
  card: { icon: CreditCard, label: "To'lov" },
  phone: { icon: Phone, label: "Aloqa" },
  star: { icon: Star, label: "Yulduz" },
  heart: { icon: Heart, label: "Yurak" },
};

export function TrustBadges({ className }: { className?: string }) {
  const t = useTranslation();
  const locale = useLanguageStore((s) => s.locale);
  const { data, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => apiGet<{ trust_badges?: TrustBadge[] }>("/settings/site"),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return null;

  // Older backends without the setting: fall back to the built-in texts
  const source: TrustBadge[] = data?.trust_badges ?? [
    { icon: "truck", title_uz: t.productPage.trust.freeDelivery, title_ru: t.productPage.trust.freeDelivery, enabled: true },
    { icon: "rotate", title_uz: t.productPage.trust.returns, title_ru: t.productPage.trust.returns, enabled: true },
    { icon: "shield", title_uz: t.productPage.trust.quality, title_ru: t.productPage.trust.quality, enabled: true },
  ];
  const items = source
    .filter((b) => b.enabled)
    .map((b) => ({
      Icon: (TRUST_ICONS[b.icon] ?? TRUST_ICONS.shield).icon,
      label: (locale === "uz" ? b.title_uz : b.title_ru) || b.title_uz || b.title_ru,
    }))
    .filter((b) => b.label);

  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "grid gap-2 rounded-md border border-neutral-100 bg-white p-3 shadow-sm sm:gap-4 sm:p-4 dark:border-neutral-800 dark:bg-neutral-900",
        items.length === 1 ? "grid-cols-1" : items.length === 2 ? "grid-cols-2" : "grid-cols-3",
        className
      )}
    >
      {items.map(({ Icon, label }, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 text-center sm:gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-50 dark:bg-secondary-950/30 sm:h-10 sm:w-10">
            <Icon className="h-4 w-4 text-secondary-600 sm:h-5 sm:w-5" />
          </div>
          <span className="text-xs font-medium leading-tight text-neutral-700 dark:text-neutral-300">{label}</span>
        </div>
      ))}
    </div>
  );
}
