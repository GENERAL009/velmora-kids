"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  User,
  Heart,
  ShoppingBag,
  Menu,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { useNotificationStore } from "@/store/notification";
import { MobileMenu } from "./mobile-menu";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const itemCount = useCartStore((state) => state.getItemCount());
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnreadCount]);

  return (
    <>
      <header
        className={cn(
          "fixed left-0 right-0 top-0 z-40 transition-all duration-400",
          isScrolled
            ? "bg-white/95 shadow-soft backdrop-blur-md dark:bg-neutral-900/95"
            : "bg-transparent"
        )}
      >
        {/* Main header */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between lg:h-18">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden"
              aria-label="Открыть меню"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <span className="font-display text-xl font-bold tracking-tight text-charcoal dark:text-white transition-colors sm:text-2xl">
                Velmora{" "}
                <span className="text-primary-500">Kids</span>
              </span>
            </Link>

            {/* Spacer */}
            <div className="hidden lg:block" />

            {/* Right actions */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              {/* Search */}
              <Link
                href="/catalog"
                className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 dark:text-neutral-300 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-primary-600"
                aria-label="Каталог"
              >
                <Search className="h-5 w-5" />
              </Link>

              {/* Notifications */}
              {mounted && isAuthenticated && (
                <Link
                  href="/account/notifications"
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-primary-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  aria-label="Уведомления"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </motion.span>
                  )}
                </Link>
              )}

              {/* Account */}
              <Link
                href="/account"
                className="hidden h-10 w-10 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-primary-600 dark:text-neutral-300 dark:hover:bg-neutral-800 sm:flex"
                aria-label="Личный кабинет"
              >
                <User className="h-5 w-5" />
              </Link>

              {/* Favorites */}
              <Link
                href="/account/favorites"
                className="relative hidden h-10 w-10 items-center justify-center rounded-full text-neutral-600 dark:text-neutral-300 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-primary-600 sm:flex"
                aria-label="Избранное"
              >
                <Heart className="h-5 w-5" />
              </Link>

              {/* Cart */}
              <Link
                href="/cart"
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 dark:text-neutral-300 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-primary-600"
                aria-label="Корзина"
              >
                <ShoppingBag className="h-5 w-5" />
                {mounted && itemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-white"
                  >
                    {itemCount > 9 ? "9+" : itemCount}
                  </motion.span>
                )}
              </Link>
            </div>
          </div>
        </div>

      </header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
}
