"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import {
  Package,
  Clock,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDate } from "@/lib/utils";
import { useAdminOrders } from "@/hooks/use-admin";

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  pending: "В ожидании",
  confirmed: "Подтвержден",
  processing: "В обработке",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменен",
  returned: "Возвращен",
  refunded: "Возврат средств",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 border-blue-200",
  pending: "bg-blue-100 text-blue-700 border-blue-200",
  confirmed: "bg-indigo-100 text-indigo-700 border-indigo-200",
  processing: "bg-amber-100 text-amber-700 border-amber-200",
  shipped: "bg-purple-100 text-purple-700 border-purple-200",
  delivered: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  returned: "bg-orange-100 text-orange-700 border-orange-200",
  refunded: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function OrdersPage() {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const { data: ordersData, isLoading } = useAdminOrders({
    page: currentPage,
    page_size: 10,
  });

  const orders = ordersData?.items ?? [];
  const totalPages = ordersData?.pages ?? 1;

  const toggleOrder = (orderId: string) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 shadow-sm">
        <h1 className="mb-2 font-display text-2xl text-charcoal dark:text-white lg:text-3xl">
          Мои заказы
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Отслеживайте статус ваших заказов и историю покупок
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6">
              <div className="h-6 w-48 bg-neutral-200 dark:bg-neutral-700 rounded mb-2" />
              <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
            </div>
          ))}
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedOrders.has(order.id);

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Order Header */}
                <div className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-secondary-400">
                        <Package className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-charcoal dark:text-white">
                          {order.order_number}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(order.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-sm font-medium ${
                          STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700 border-gray-200"
                        }`}
                      >
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                      <button
                        onClick={() => toggleOrder(order.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-600 dark:text-neutral-400 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700"
                        aria-label={isExpanded ? "Свернуть" : "Развернуть"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {order.customer_first_name
                          ? `${order.customer_first_name} ${order.customer_last_name || ""}`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Итого</p>
                      <p className="font-display text-xl font-semibold text-charcoal dark:text-white">
                        {formatPrice(order.total)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Expanded Order Details */}
                {isExpanded && (
                  <div className="border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/30 p-4">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Подробнее
                      </Button>
                      {order.status === "delivered" && (
                        <Button variant="outline" size="sm">
                          Оставить отзыв
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Назад
              </Button>
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Вперёд
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-12 text-center shadow-sm">
          <Package className="mx-auto mb-4 h-16 w-16 text-neutral-300 dark:text-neutral-600" />
          <h2 className="mb-2 font-display text-xl text-charcoal dark:text-white">
            У вас пока нет заказов
          </h2>
          <p className="mb-6 text-neutral-600 dark:text-neutral-400">
            Начните делать покупки прямо сейчас
          </p>
          <Link href="/catalog">
            <Button size="lg">Перейти в каталог</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
