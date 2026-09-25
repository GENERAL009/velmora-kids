"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, User, Heart, MapPin, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useNotificationStore } from "@/store/notification";
import { useTranslation } from "@/hooks/use-translation";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const t = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const navLinks = [
    { href: "/catalog", label: t.nav.catalog, highlight: false },
  ];

  const accountLinks = [
    { href: "/account", label: t.nav.account, icon: User },
    { href: "/account/notifications", label: t.nav.notifications, icon: Bell },
    { href: "/account/favorites", label: t.nav.favorites, icon: Heart },
    { href: "/account/orders", label: t.nav.myOrders, icon: MapPin },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Menu panel */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-50 w-full max-w-sm bg-white shadow-elevated dark:bg-neutral-900"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-6 py-4">
                <span className="font-display text-lg font-bold text-charcoal dark:text-white">
                  Velmora <span className="text-primary-500">Kids</span>
                </span>
                <button
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  aria-label="Закрыть меню"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation */}
              <div className="flex-1 overflow-y-auto">
                <nav className="px-4 py-4">
                  <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    {t.nav.catalog}
                  </p>
                  <ul className="space-y-0.5">
                    {navLinks.map((link, i) => (
                      <motion.li
                        key={link.href}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Link
                          href={link.href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center justify-between rounded-md px-3 py-3 text-sm font-medium transition-colors",
                            link.highlight
                              ? "text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/20"
                              : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                          )}
                        >
                          {link.label}
                          <ChevronRight className="h-4 w-4 text-neutral-300 dark:text-neutral-600" />
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                </nav>

                <div className="mx-6 border-t border-neutral-100 dark:border-neutral-800" />

                <nav className="px-4 py-4">
                  <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    {t.account.title}
                  </p>
                  <ul className="space-y-0.5">
                    {accountLinks.map((link, i) => (
                      <motion.li
                        key={link.href}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (navLinks.length + i) * 0.05 }}
                      >
                        <Link
                          href={link.href}
                          onClick={onClose}
                          className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800"
                        >
                          <link.icon className="h-4 w-4 text-neutral-400" />
                          {link.label}
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                </nav>
              </div>

              {/* Footer */}
              <div className="border-t border-neutral-100 dark:border-neutral-800 px-6 py-4">
                {isAuthenticated && (
                  <Link
                    href="/account/notifications"
                    onClick={onClose}
                    className="mb-3 flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="h-4 w-4" />
                      {t.nav.notifications}
                    </div>
                    {unreadCount > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                )}
                <p className="mt-2 text-xs text-neutral-400">
                  +998 71 200 00 00
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
