"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, User, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import { useTranslation } from "@/hooks/use-translation";

export function MobileBottomNav() {
  const t = useTranslation();
  const navItems = [
    { href: "/", label: t.layoutUi.bottomNav.home, icon: Home },
    { href: "/catalog", label: t.nav.catalog, icon: LayoutGrid },
    { href: "/cart", label: t.nav.cart, icon: ShoppingBag },
    { href: "/account", label: t.layoutUi.bottomNav.account, icon: User },
  ];
  const pathname = usePathname();
  const itemCount = useCartStore((s) => s.getItemCount());

  if (pathname.startsWith("/admin") || pathname.startsWith("/checkout")) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/95 lg:hidden">
      <div className="flex items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-medium transition-colors min-h-[44px] justify-center",
                isActive
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-neutral-500 dark:text-neutral-400"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.href === "/cart" && itemCount > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-500 px-1 text-[9px] font-bold text-white">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-safe-area-inset-bottom bg-white dark:bg-neutral-900" />
    </nav>
  );
}
