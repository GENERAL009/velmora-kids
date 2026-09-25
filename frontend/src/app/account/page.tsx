"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  Package,
  Heart,
  MapPin,
  Clock,
  TrendingUp,
  Gift,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDate } from "@/lib/utils";
import { useRecentOrders } from "@/hooks/use-admin";
import { useTranslation } from "@/hooks/use-translation";

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  pending: "В ожидании",
  confirmed: "Подтвержден",
  processing: "В обработке",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменен",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  pending: "bg-blue-100 text-blue-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  processing: "bg-amber-100 text-amber-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function AccountPage() {
  const { user } = useAuthStore();
  const t = useTranslation();
  const { data: ordersData } = useRecentOrders(3);

  const QUICK_LINKS = [
    {
      title: t.nav.myOrders,
      description: t.account.orders,
      href: "/account/orders",
      icon: Package,
      color: "from-primary-400 to-primary-600",
    },
    {
      title: t.nav.favorites,
      description: t.account.favorites,
      href: "/account/favorites",
      icon: Heart,
      color: "from-red-400 to-red-600",
    },
  ];

  const recentOrders = ordersData?.items ?? [];
  const totalOrders = ordersData?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-gradient-to-br from-white to-primary-50/30 dark:from-neutral-900 dark:to-primary-950/20 p-6 shadow-sm lg:p-8">
        <h1 className="mb-2 font-display text-2xl text-charcoal dark:text-white lg:text-3xl">
          {t.account.welcome}, {user?.first_name}!
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Управляйте своими заказами, адресами и настройками профиля
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div className="mb-2 flex items-center gap-2 text-primary-600">
            <Package className="h-5 w-5" />
            <span className="text-sm font-medium">Всего заказов</span>
          </div>
          <p className="font-display text-3xl text-charcoal dark:text-white">{totalOrders}</p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div className="mb-2 flex items-center gap-2 text-secondary-600">
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm font-medium">Потрачено</span>
          </div>
          <p className="font-display text-3xl text-charcoal dark:text-white">
            {formatPrice(recentOrders.reduce((sum, o) => sum + o.total, 0))}
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div className="mb-2 flex items-center gap-2 text-accent-600">
            <Gift className="h-5 w-5" />
            <span className="text-sm font-medium">Избранное</span>
          </div>
          <Link href="/account/favorites" className="font-display text-3xl text-charcoal dark:text-white hover:text-primary-600">
            ♥
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="mb-4 font-display text-xl text-charcoal dark:text-white">Быстрые ссылки</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 transition-all hover:shadow-md"
              >
                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${link.color} shadow-sm`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-1 font-medium text-charcoal dark:text-white group-hover:text-primary-600">
                  {link.title}
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{link.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-charcoal dark:text-white">Последние заказы</h2>
          <Link href="/account/orders">
            <Button variant="ghost" size="sm">
              Все заказы
            </Button>
          </Link>
        </div>

        {recentOrders.length > 0 ? (
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="block rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <p className="font-medium text-charcoal dark:text-white">
                        {order.order_number}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDate(order.created_at, { month: "short", day: "numeric" })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-charcoal dark:text-white">
                      {formatPrice(order.total)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Package className="mx-auto mb-3 h-12 w-12 text-neutral-300" />
            <p className="mb-1 font-medium text-neutral-700 dark:text-neutral-300">
              {t.account.noOrders}
            </p>
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
              Начните делать покупки прямо сейчас
            </p>
            <Link href="/catalog">
              <Button>{t.cart.goToCatalog}</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Loyalty Program Card */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-gradient-to-br from-accent-50 via-white to-primary-50 dark:from-accent-950/20 dark:via-neutral-900 dark:to-primary-950/20 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 text-white shadow-sm">
            <Gift className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="mb-1 font-display text-lg text-charcoal dark:text-white">
              Программа лояльности
            </h3>
            <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-400">
              Совершайте покупки и накапливайте бонусные баллы!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
