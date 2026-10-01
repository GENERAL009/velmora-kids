"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  User,
  Package,
  Heart,
  MapPin,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useNotificationStore } from "@/store/notification";
import { useTranslation } from "@/hooks/use-translation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout, refreshUser } = useAuthStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const t = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const navigation = [
    { name: t.account.profile, href: "/account", icon: User },
    { name: t.nav.notifications, href: "/account/notifications", icon: Bell },
    { name: t.nav.myOrders, href: "/account/orders", icon: Package },
    { name: t.nav.favorites, href: "/account/favorites", icon: Heart },
    { name: t.profile.addresses.nav, href: "/account/addresses", icon: MapPin },
    { name: t.account.settings, href: "/account/settings", icon: Settings },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push("/auth/login");
    }
    if (mounted && isAuthenticated && !user) {
      refreshUser();
    }
  }, [mounted, isAuthenticated, user, router, refreshUser]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (!mounted) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-cream pb-8 pt-20 dark:bg-neutral-950 lg:pb-12 lg:pt-24">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream pb-8 pt-20 dark:bg-neutral-950 lg:pb-12 lg:pt-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 lg:grid-cols-4 lg:gap-8">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
                {/* User Info Card */}
                <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 p-6 shadow-sm">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 text-2xl font-bold text-white">
                    {user?.first_name?.[0]?.toUpperCase()}
                    {user?.last_name?.[0]?.toUpperCase()}
                  </div>
                  <h2 className="mb-1 font-display text-xl text-charcoal dark:text-white">
                    {user?.first_name} {user?.last_name}
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{user?.email}</p>
                </div>

                {/* Navigation */}
                <nav className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 shadow-sm overflow-hidden">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    const showBadge = item.href === "/account/notifications" && unreadCount > 0;

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 px-6 py-4 transition-colors last:border-b-0 ${
                          isActive
                            ? "bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-400"
                            : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium flex-1">{item.name}</span>
                        {showBadge && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-6 py-4 text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">{t.account.logout}</span>
                  </button>
                </nav>
              </div>
            </aside>

            {/* Mobile Menu Toggle */}
            <div className="lg:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="mb-4"
              >
                {isMobileMenuOpen ? (
                  <X className="mr-2 h-4 w-4" />
                ) : (
                  <Menu className="mr-2 h-4 w-4" />
                )}
                {t.account.title}
              </Button>

              {/* Mobile Menu */}
              {isMobileMenuOpen && (
                <div className="mb-6 rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 shadow-sm overflow-hidden">
                  <div className="border-b border-neutral-200 dark:border-neutral-700 p-4">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 text-lg font-bold text-white">
                      {user?.first_name?.[0]?.toUpperCase()}
                      {user?.last_name?.[0]?.toUpperCase()}
                    </div>
                    <h2 className="mb-1 font-display text-lg text-charcoal dark:text-white">
                      {user?.first_name} {user?.last_name}
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{user?.email}</p>
                  </div>

                  {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    const showBadge = item.href === "/account/notifications" && unreadCount > 0;

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 px-4 py-3 transition-colors last:border-b-0 ${
                          isActive
                            ? "bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-400"
                            : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium flex-1">{item.name}</span>
                        {showBadge && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-3 text-neutral-700 dark:text-neutral-300 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">{t.account.logout}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">{children}</div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
