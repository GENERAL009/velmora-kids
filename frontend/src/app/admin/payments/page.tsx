"use client";

export const dynamic = "force-dynamic";

import React, { useState } from "react";
import { Search, CreditCard, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { DataTable, Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  useAdminOrders,
  useConfirmPayment,
  useSuspiciousPayment,
  useRejectPayment,
  type AdminOrder,
} from "@/hooks/use-admin";
import { formatDate, formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PAYMENT_STATUSES = [
  { value: "all", label: "Barchasi" },
  { value: "pending", label: "Kutilmoqda" },
  { value: "paid", label: "To'langan" },
  { value: "failed", label: "Xatolik" },
  { value: "refunded", label: "Qaytarilgan" },
];

const PAYMENT_METHODS: Record<string, string> = {
  cash: "Naqd",
  card_transfer: "Karta o'tkazma",
  bank_transfer: "Bank o'tkazma",
  payme: "Payme",
  click: "Click",
  card: "Karta",
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

  const confirmMutation = useConfirmPayment();
  const suspiciousMutation = useSuspiciousPayment();
  const rejectMutation = useRejectPayment();

  const orders = data?.items ?? [];
  const totalPages = data?.pages ?? 1;

  const columns: Column<AdminOrder>[] = [
    {
      key: "order_number",
      label: "Buyurtma",
      sortable: true,
      render: (order) => (
        <span className="font-medium text-primary-600 dark:text-primary-400">{order.order_number}</span>
      ),
    },
    {
      key: "customer",
      label: "Xaridor",
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
      label: "Summa",
      sortable: true,
      render: (order) => (
        <span className="font-semibold">{formatPrice(Number(order.total))}</span>
      ),
    },
    {
      key: "payment_method",
      label: "To'lov usuli",
      render: (order) => (
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-neutral-400" />
          <span>{PAYMENT_METHODS[order.payment_method ?? ""] ?? order.payment_method ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "payment_status",
      label: "To'lov holati",
      render: (order) => <StatusBadge status={order.payment_status} />,
    },
    {
      key: "status",
      label: "Buyurtma holati",
      render: (order) => <StatusBadge status={order.status} />,
    },
    {
      key: "created_at",
      label: "Sana",
      sortable: true,
      render: (order) => <span className="text-neutral-500">{formatDate(order.created_at)}</span>,
    },
    {
      key: "actions",
      label: "Amallar",
      render: (order) => {
        if (order.payment_status === "paid" || order.payment_status === "refunded") return null;

        const isLoading =
          confirmMutation.isPending || suspiciousMutation.isPending || rejectMutation.isPending;

        return (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {order.payment_status !== "failed" && (
              <>
                <button
                  onClick={() => confirmMutation.mutate(order.id)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1 rounded-md bg-green-50 px-3 py-2 text-xs font-medium lg:px-2.5 lg:py-1.5 text-green-700 hover:bg-green-100 disabled:opacity-50 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
                  title="Tasdiqlash"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Tasdiqlash</span>
                </button>
                <button
                  onClick={() => suspiciousMutation.mutate(order.id)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium lg:px-2.5 lg:py-1.5 text-amber-700 hover:bg-amber-100 disabled:opacity-50 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40"
                  title="Shubhali"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Shubhali</span>
                </button>
              </>
            )}
            <button
              onClick={() => rejectMutation.mutate(order.id)}
              disabled={isLoading}
              className="inline-flex items-center gap-1 rounded-md bg-red-50 px-3 py-2 text-xs font-medium lg:px-2.5 lg:py-1.5 text-red-700 hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
              title="Rad etish"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Rad etish</span>
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">To'lovlar</h1>
        <p className="mt-1 text-sm text-neutral-500">Buyurtma to'lovlarini boshqarish</p>
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
            placeholder="Raqam bo'yicha qidirish..."
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
        emptyMessage="To'lovlar topilmadi"
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-neutral-700"
          >
            Orqaga
          </button>
          <span className="text-sm text-neutral-500">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-neutral-700"
          >
            Oldinga
          </button>
        </div>
      )}
    </div>
  );
}
