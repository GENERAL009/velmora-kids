"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, Sun, Moon, ChevronDown } from "lucide-react";
import { SidebarNav } from "@/components/admin/sidebar-nav";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { cn } from "@/lib/utils";

const ADMIN_ROLES = ["super_admin", "director", "seller", "call_center"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, refreshUser, isLoading, logout } = useAuthStore();
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }
    if (!user && !isLoading) {
      refreshUser();
      return;
    }
    if (user && !ADMIN_ROLES.includes(user.role)) {
      router.replace("/auth/login");
      return;
    }
    if (user && ADMIN_ROLES.includes(user.role)) {
      setAuthChecked(true);
    }
  }, [isAuthenticated, user, isLoading, router, refreshUser]);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="animate-pulse text-neutral-400">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-neutral-900 dark:bg-neutral-900 border-r border-neutral-800 transform transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-800">
            <h1 className="text-xl font-display font-bold text-white">
              Velmora <span className="text-primary-400">Admin</span>
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-neutral-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <div
            className="flex-1 overflow-y-auto p-4"
            onClick={(e) => {
              // close the off-canvas menu on phones/tablets once a page is picked
              if ((e.target as HTMLElement).closest("a")) setSidebarOpen(false);
            }}
          >
            <SidebarNav userRole={user?.role ?? "admin"} />
          </div>

          {/* User info at bottom */}
          <div className="p-4 border-t border-neutral-800">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neutral-800">
              <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
                {(user?.first_name?.[0] ?? "A").toUpperCase()}{(user?.last_name?.[0] ?? "").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-neutral-400 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top header */}
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
            {/* Left: Mobile menu button + Search */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Menyu"
                className="lg:hidden -ml-1 p-1.5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
              >
                <Menu className="w-6 h-6" />
              </button>

              <Link href="/admin" className="font-display text-lg font-bold text-neutral-900 dark:text-white lg:hidden">
                Velmora <span className="text-primary-500">Admin</span>
              </Link>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {/* Dark mode toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                aria-label="Toggle dark mode"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-semibold">
                    {(user?.first_name?.[0] ?? "A").toUpperCase()}
                  </div>
                  <ChevronDown className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-800 rounded-lg shadow-elevated border border-neutral-200 dark:border-neutral-700 py-2 z-20">
                      <div className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-700">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">{user?.first_name} {user?.last_name}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{user?.role === "super_admin" ? "Super admin" : user?.role === "director" ? "Direktor" : user?.role === "seller" ? "Sotuvchi" : user?.role === "call_center" ? "Call markaz" : user?.role}</p>
                      </div>
                      <Link href="/" onClick={() => setUserMenuOpen(false)} className="block w-full px-4 py-2 text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700">
                        Saytga o&apos;tish
                      </Link>
                      <Link href="/account/settings" onClick={() => setUserMenuOpen(false)} className="block w-full px-4 py-2 text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700">
                        Profil
                      </Link>
                      {(user?.role === "super_admin" || user?.role === "director") && (
                        <Link href="/admin/settings" onClick={() => setUserMenuOpen(false)} className="block w-full px-4 py-2 text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700">
                          Sozlamalar
                        </Link>
                      )}
                      <div className="border-t border-neutral-200 dark:border-neutral-700 mt-2 pt-2">
                        <button
                          onClick={() => { logout(); router.replace("/auth/login"); }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                        >
                          Chiqish
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
