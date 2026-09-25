"use client";

import React, { useState } from "react";
import { DollarSign, ShoppingBag, TrendingUp, Package, AlertTriangle } from "lucide-react";
import { useDashboardKPIs, useTopProducts } from "@/hooks/use-admin";
import { cn } from "@/lib/utils";

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " сум";
}

export default function ReportsPage() {
  const [days, setDays] = useState(30);
  const { data: kpis, isLoading } = useDashboardKPIs(days);
  const { data: topProducts = [] } = useTopProducts(10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Отчёты</h1>
          <p className="mt-1 text-sm text-neutral-500">Аналитика за выбранный период</p>
        </div>
        <div className="flex gap-1">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn("rounded-lg px-3 py-2 text-xs font-medium transition-colors", days === d ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300")}
            >
              {d} дней
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Выручка", value: kpis ? formatMoney(kpis.revenue) : "—", icon: DollarSign, color: "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400" },
          { label: "Заказы", value: kpis?.orders ?? "—", icon: ShoppingBag, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400" },
          { label: "Средний чек", value: kpis ? formatMoney(kpis.average_order_value) : "—", icon: TrendingUp, color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400" },
          { label: "Товаров", value: kpis?.total_products ?? "—", icon: Package, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">
                  {isLoading ? <span className="inline-block h-7 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" /> : card.value}
                </p>
              </div>
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", card.color)}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {kpis && (kpis.low_stock > 0 || kpis.out_of_stock > 0) && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <strong>{kpis.low_stock}</strong> товаров с низким остатком, <strong>{kpis.out_of_stock}</strong> нет в наличии
          </div>
        </div>
      )}

      {/* Top Products */}
      <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        <div className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Топ товары</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800">
            <tr>
              <th className="px-5 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">#</th>
              <th className="px-5 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Товар</th>
              <th className="px-5 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">Продано</th>
              <th className="px-5 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">Выручка</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {topProducts.map((p, i) => (
              <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                <td className="px-5 py-3 font-medium text-neutral-400">{i + 1}</td>
                <td className="px-5 py-3 font-medium text-neutral-900 dark:text-white">{p.product}</td>
                <td className="px-5 py-3 text-right text-neutral-600 dark:text-neutral-400">{p.sold}</td>
                <td className="px-5 py-3 text-right font-medium text-neutral-900 dark:text-white">{formatMoney(p.revenue)}</td>
              </tr>
            ))}
            {topProducts.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-neutral-500">Нет данных за этот период</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
