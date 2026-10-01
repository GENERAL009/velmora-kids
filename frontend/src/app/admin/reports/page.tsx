"use client";

import React, { useState } from "react";
import { DollarSign, ShoppingBag, TrendingUp, Wallet, AlertTriangle, XCircle, Clock } from "lucide-react";
import {
  useDashboardKPIs,
  useOrdersByStatus,
  usePaymentAnalytics,
  useRevenueData,
  useTopProducts,
} from "@/hooks/use-admin";
import { RevenueBarChart, StatusBreakdown } from "@/components/admin/report-charts";
import { cn, formatPrice } from "@/lib/utils";

const PROVIDER_LABELS: Record<string, string> = {
  cash: "Naqd pul",
  card_transfer: "Kartadan kartaga",
  bank_transfer: "Bank o'tkazmasi",
  payme: "Payme",
  click: "Click",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  completed: "Tasdiqlangan",
  pending: "Kutilmoqda",
  suspicious: "Shubhali",
  failed: "Rad etilgan",
  cancelled: "Bekor qilingan",
  refunded: "Qaytarilgan",
};

const CARD = "rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900";

export default function ReportsPage() {
  const [days, setDays] = useState(30);
  const { data: kpis, isLoading } = useDashboardKPIs(days);
  const { data: revenue = [] } = useRevenueData(days);
  const { data: statusCounts = [] } = useOrdersByStatus(days);
  const { data: payments = [] } = usePaymentAnalytics(days);
  const { data: topProducts = [] } = useTopProducts(10, days);

  // Payments grouped by method; confirmed money vs everything else
  const byProvider = Object.values(
    payments.reduce<Record<string, { provider: string; completed: number; completedCount: number; other: Record<string, number> }>>(
      (acc, row) => {
        const p = (acc[row.provider] ??= { provider: row.provider, completed: 0, completedCount: 0, other: {} });
        if (row.status === "completed") {
          p.completed += row.total;
          p.completedCount += row.count;
        } else {
          p.other[row.status] = (p.other[row.status] ?? 0) + row.count;
        }
        return acc;
      },
      {}
    )
  ).sort((a, b) => b.completed - a.completed);
  const completedTotal = byProvider.reduce((s, p) => s + p.completed, 0);

  const cards = [
    { label: "Daromad (to'langan)", value: kpis ? formatPrice(kpis.revenue) : "—", icon: DollarSign, color: "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400" },
    { label: "To'langan buyurtmalar", value: kpis ? `${kpis.paid_orders} / ${kpis.orders}` : "—", icon: ShoppingBag, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400" },
    { label: "O'rtacha chek", value: kpis ? formatPrice(kpis.average_order_value) : "—", icon: TrendingUp, color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400" },
    { label: "Yalpi foyda", value: kpis ? formatPrice(kpis.gross_profit) : "—", icon: Wallet, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400" },
    { label: "Bekor / qaytarilgan", value: kpis?.cancelled_orders ?? "—", icon: XCircle, color: "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400" },
    { label: "To'lov kutilmoqda (hozir)", value: kpis?.awaiting_payment ?? "—", icon: Clock, color: "text-neutral-600 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Hisobotlar</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Oxirgi {days} kun (bugun bilan) · Toshkent vaqti · daromad to'lov sanasi bo'yicha
          </p>
        </div>
        <div className="flex gap-1">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                days === d ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
              )}
            >
              {d} kun
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className={`${CARD} p-5`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{card.label}</p>
                <p className="mt-1 truncate text-2xl font-bold text-neutral-900 dark:text-white">
                  {isLoading ? <span className="inline-block h-7 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" /> : card.value}
                </p>
              </div>
              <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg", card.color)}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="-mt-3 text-xs text-neutral-500">
        Daromadga faqat to&apos;langan va bekor qilinmagan buyurtmalar kiradi. Yalpi foyda = tovarlar savdosi − sotib olish
        narxi (mahsulotning joriy sotib olish narxi bo&apos;yicha), yetkazish haqisiz.
      </p>

      {/* Alerts */}
      {kpis && (kpis.low_stock > 0 || kpis.out_of_stock > 0) && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <strong>{kpis.low_stock}</strong> ta variant kam qoldiqda (≤5), <strong>{kpis.out_of_stock}</strong> tasi tugagan
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className={`${CARD} p-5 lg:col-span-2`}>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Kunlik daromad</h2>
          <p className="mb-5 text-xs text-neutral-500">Ustunga olib boring — kun summasi va buyurtmalar soni</p>
          <RevenueBarChart data={revenue} height={220} />
        </div>
        <div className={`${CARD} p-5`}>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Buyurtmalar holati</h2>
          <p className="mb-5 text-xs text-neutral-500">Davr ichida yaratilgan buyurtmalar</p>
          <StatusBreakdown data={statusCounts} />
        </div>
      </div>

      {/* Payment methods */}
      <div className={CARD}>
        <div className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">To&apos;lov usullari</h2>
          <p className="text-xs text-neutral-500">Tasdiqlangan summa va boshqa holatdagi to&apos;lovlar soni</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Usul</th>
                <th className="px-5 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">Tasdiqlangan</th>
                <th className="px-5 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">Ulushi</th>
                <th className="px-5 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Boshqa holatlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {byProvider.map((p) => {
                const share = completedTotal ? Math.round((p.completed / completedTotal) * 100) : 0;
                return (
                  <tr key={p.provider}>
                    <td className="px-5 py-3 font-medium text-neutral-900 dark:text-white">{PROVIDER_LABELS[p.provider] ?? p.provider}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-neutral-900 dark:text-white">
                      {formatPrice(p.completed)}
                      <span className="ml-1.5 text-xs text-neutral-500">({p.completedCount})</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="ml-auto flex w-32 items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
                          <div className="h-full rounded-full bg-primary-400" style={{ width: `${share}%` }} />
                        </div>
                        <span className="w-9 text-right text-xs tabular-nums text-neutral-600 dark:text-neutral-400">{share}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-neutral-600 dark:text-neutral-400">
                      {Object.entries(p.other).length === 0
                        ? "—"
                        : Object.entries(p.other)
                            .map(([st, c]) => `${PAYMENT_STATUS_LABELS[st] ?? st}: ${c}`)
                            .join(" · ")}
                    </td>
                  </tr>
                );
              })}
              {byProvider.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-neutral-500">Bu davrda to&apos;lovlar yo&apos;q</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Products */}
      <div className={CARD}>
        <div className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Top mahsulotlar</h2>
          <p className="text-xs text-neutral-500">To&apos;langan buyurtmalar bo&apos;yicha, shu davrda</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">#</th>
                <th className="px-5 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Mahsulot</th>
                <th className="px-5 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">Sotilgan</th>
                <th className="px-5 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">Daromad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {topProducts.map((p, i) => (
                <tr key={p.product} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <td className="px-5 py-3 font-medium text-neutral-400">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-neutral-900 dark:text-white">{p.product}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-neutral-600 dark:text-neutral-400">{p.sold} dona</td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums text-neutral-900 dark:text-white">{formatPrice(p.revenue)}</td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-neutral-500">Bu davr uchun ma&apos;lumotlar yo&apos;q</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
