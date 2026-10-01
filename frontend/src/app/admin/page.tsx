"use client";

export const dynamic = "force-dynamic";

import React, { useState } from "react";
import { DollarSign, ShoppingCart, TrendingUp, Wallet, AlertTriangle, Package, Eye } from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatPrice } from "@/lib/utils";
import {
  useDashboardKPIs,
  useRevenueData,
  useTopProducts,
  useRecentOrders,
  useLowStockItems,
  useOrdersByStatus,
} from "@/hooks/use-admin";
import { RevenueBarChart, StatusBreakdown } from "@/components/admin/report-charts";
import { useMostViewedProducts } from "@/hooks/use-products";

// Calendar days in the shop timezone; "month" = since the 1st of the current month
const periodDays = (range: "today" | "7days" | "30days" | "month") => {
  if (range === "today") return 1;
  if (range === "7days") return 7;
  if (range === "30days") return 30;
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tashkent" }));
  return now.getDate();
};

export default function AdminDashboard() {
  const [dateRange, setDateRange] = useState<"today" | "7days" | "30days" | "month">("7days");

  const days = periodDays(dateRange);

  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs(days);
  const { data: revenueData } = useRevenueData(days);
  const { data: topProducts } = useTopProducts(5, days);
  const { data: statusCounts } = useOrdersByStatus(days);
  const { data: ordersData } = useRecentOrders(5);
  const { data: lowStockItems } = useLowStockItems(5);
  const { data: mostViewed } = useMostViewedProducts(10);

  const recentOrders = ordersData?.items ?? [];
  const revenue = revenueData ?? [];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Boshqaruv paneli</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Boshqaruv paneliga xush kelibsiz
          </p>
        </div>
        <div className="flex gap-2">
          {(["today", "7days", "30days", "month"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                dateRange === range
                  ? "bg-primary-500 text-white"
                  : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              }`}
            >
              {range === "today" && "Bugun"}
              {range === "7days" && "7 kun"}
              {range === "30days" && "30 kun"}
              {range === "month" && "Shu oy"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Daromad (to'langan)"
          value={kpisLoading ? "..." : formatPrice(kpis?.revenue ?? 0)}
          icon={DollarSign}
        />
        <StatCard
          title="Buyurtmalar"
          value={kpisLoading ? "..." : `${kpis?.orders ?? 0}`}
          icon={ShoppingCart}
        />
        <StatCard
          title="O'rtacha chek"
          value={kpisLoading ? "..." : formatPrice(kpis?.average_order_value ?? 0)}
          icon={TrendingUp}
        />
        <StatCard
          title="Yalpi foyda"
          value={kpisLoading ? "..." : formatPrice(kpis?.gross_profit ?? 0)}
          icon={Wallet}
        />
      </div>
      {kpis && (
        <p className="-mt-4 text-xs text-neutral-500 dark:text-neutral-400">
          {kpis.paid_orders} ta to'langan · {kpis.cancelled_orders} ta bekor/qaytarilgan · {kpis.awaiting_payment} ta to'lov kutilmoqda.
          Yalpi foyda = tovarlar savdosi − sotib olish narxi (joriy narx bo'yicha), yetkazish haqisiz.
        </p>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-soft border border-neutral-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Kunlik daromad
          </h3>
          <p className="mb-5 text-xs text-neutral-500">
            {days === 1 ? "Bugun" : `Oxirgi ${days} kun`} · to'lov sanasi bo'yicha, Toshkent vaqti
          </p>
          <RevenueBarChart data={revenue} />
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-soft border border-neutral-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Buyurtmalar holati
          </h3>
          <p className="mb-5 text-xs text-neutral-500">Tanlangan davrda yaratilgan buyurtmalar</p>
          <StatusBreakdown data={statusCounts ?? []} />
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-soft border border-neutral-200 dark:border-neutral-700">
          <div className="p-6 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Oxirgi buyurtmalar
            </h3>
            <Link href="/admin/orders" className="text-sm text-primary-600 hover:text-primary-700">
              Barcha buyurtmalar
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 dark:bg-neutral-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase">
                    Raqam
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase">
                    Mijoz
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase">
                    Holat
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase">
                    Summa
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer">
                      <td className="px-4 py-3 text-sm font-medium text-primary-600 dark:text-primary-400">
                        {order.order_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                        {order.customer_first_name
                          ? `${order.customer_first_name} ${order.customer_last_name || ""}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-right text-neutral-900 dark:text-neutral-100">
                        {formatPrice(order.total)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                      Buyurtmalar yo'q
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-soft border border-neutral-200 dark:border-neutral-700">
          <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Top mahsulotlar
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 dark:bg-neutral-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase">
                    Nomi
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase">
                    Sotildi
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase">
                    Daromad
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {(topProducts ?? []).length > 0 ? (
                  (topProducts ?? []).map((product, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 flex items-center justify-center text-xs font-semibold">
                            {idx + 1}
                          </span>
                          <span className="text-sm text-neutral-900 dark:text-neutral-100">
                            {product.product}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-right text-neutral-900 dark:text-neutral-100">
                        {product.sold}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-right text-neutral-900 dark:text-neutral-100">
                        {formatPrice(product.revenue)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-neutral-400">
                      Ma'lumot yo'q
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Most Viewed Products */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-soft border border-neutral-200 dark:border-neutral-700">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
              <Eye className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Eng ko'p ko'rilgan mahsulotlar
            </h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase">
                  Mahsulot
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase">
                  Brend
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase">
                  Narx
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase">
                  Ko'rishlar
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {(mostViewed ?? []).length > 0 ? (
                (mostViewed ?? []).map((product, idx) => (
                  <tr key={product.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                    <td className="px-4 py-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/product/${product.slug}`} className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">
                        {product.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                      {product.brand?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-right text-neutral-900 dark:text-neutral-100">
                      {formatPrice(product.price)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-900/30 px-3 py-1 text-sm font-semibold text-violet-700 dark:text-violet-300">
                        <Eye className="w-3.5 h-3.5" />
                        {product.views ?? 0}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                    Ko'rishlar haqida ma'lumot yo'q
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-2">
                Omborda kam qoldiq
              </h3>
              <p className="text-sm text-orange-700 dark:text-orange-300 mb-4">
                {kpis?.low_stock ?? 0} ta pozitsiya to'ldirilishi kerak
              </p>
              <div className="space-y-2">
                {(lowStockItems ?? []).slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-white dark:bg-neutral-800 rounded-lg px-4 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        {item.product?.name ?? "—"}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {item.sku ?? "—"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                      {item.stock} dona
                    </span>
                  </div>
                ))}
                {(lowStockItems ?? []).length === 0 && (
                  <p className="text-sm text-orange-600 dark:text-orange-400">
                    Barcha pozitsiyalar mavjud
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Kutilayotgan buyurtmalar
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                {kpis?.pending_orders ?? 0} ta yangi buyurtma tasdiqlanishi kerak
              </p>
              <Link
                href="/admin/orders?status=new"
                className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Buyurtmalarga o'tish
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
