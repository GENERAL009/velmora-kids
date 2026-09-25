"use client";

export const dynamic = "force-dynamic";

import React, { useState } from "react";
import { Search, CreditCard } from "lucide-react";
import { DataTable, Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { useAdminOrders, type AdminOrder } from "@/hooks/use-admin";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PAYMENT_STATUSES = [
  { value: "all", label: "Все" },
  { value: "pending", label: "Ожидание" },
  { value: "paid", label: "Оплачен" },
  { value: "failed", label: "Ошибка" },
  { value: "refunded", label: "Возврат" },
];

const PAYMENT_METHODS: Record<string, string> = {
  cash: "Наличные",
  card_transfer: "Карта перевод",
  bank_transfer: "Банк перевод",
  payme: "Payme",
  click: "Click",
  card: "Карта",
};

export default function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useAdminOrders({
    page: currentPage,
    page_size: pageSize,
    payment_status: statusFilter !== "all" ? statusFilter : undefined,
    search: searchQuery || undefined,
  });

  const orders = data?.items ?? [];
  const totalPages = data?.pages ?? 1;

  const columns: Column<AdminOrder>[] = [
    {
      key: "order_number",
      label: "Заказ",
      sortable: true,
      render: (order) => (
        <span className="font-medium text-primary-600 dark:text-primary-400">{order.order_number}</span>
      ),
    },
    {
      key: "customer",
      label: "Покупатель",
      render: (order) => (
        <div>
          <p className="font-medium">{order.customer_first_name} {order.customer_last_name}</p>
          {order.customer_phone && (
            <p className="text-xs text-neutral-500">{order.customer_phone}</p>
          )}
        </div>
      ),
    },
    {
      key: "total",
      label: "Сумма",
      sortable: true,
      render: (order) => (
        <span className="font-semibold">{Number(order.total).toLocaleString("ru-RU")} сум</span>
      ),
    },
    {
      key: "payment_method",
      label: "Способ оплаты",
      render: (order) => (
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-neutral-400" />
          <span>{PAYMENT_METHODS[order.payment_method ?? ""] ?? order.payment_method ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "payment_status",
      label: "Статус оплаты",
      render: (order) => <StatusBadge status={order.payment_status} />,
    },
    {
      key: "status",
      label: "Статус заказа",
      render: (order) => <StatusBadge status={order.status} />,
    },
    {
      key: "created_at",
      label: "Дата",
      sortable: true,
      render: (order) => <span className="text-neutral-500">{formatDate(order.created_at)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Платежи</h1>
        <p className="mt-1 text-sm text-neutral-500">Управление платежами и оплатами заказов</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {PAYMENT_STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => { setStatusFilter(s.value); setCurrentPage(1); }}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                statusFilter === s.value
                  ? "bg-primary-500 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            placeholder="Поиск по номеру..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-10 pr-4 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        keyExtractor={(o) => o.id}
        isLoading={isLoading}
        emptyMessage="Нет платежей"
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-neutral-700"
          >
            Назад
          </button>
          <span className="text-sm text-neutral-500">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-neutral-700"
          >
            Далее
          </button>
        </div>
      )}
    </div>
  );
}
