"use client";

export const dynamic = "force-dynamic";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Plus, Search, ChevronDown } from "lucide-react";
import { DataTable, Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDate } from "@/lib/utils";
import { useAdminOrders, type AdminOrder } from "@/hooks/use-admin";
import { apiPatch } from "@/lib/api";

/** Allowed status transitions keyed by current status */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Подтвердить",
  processing: "В обработку",
  shipped: "Отправить",
  delivered: "Доставлен",
  cancelled: "Отменить",
};

/** Inline dropdown for quick status change per row */
function StatusDropdown({
  order,
  onStatusChange,
  isPending,
}: {
  order: AdminOrder;
  onStatusChange: (orderId: string, newStatus: string) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const transitions = STATUS_TRANSITIONS[order.status] ?? [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (transitions.length === 0) {
    return <span className="text-xs text-neutral-400">--</span>;
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() => setOpen((v) => !v)}
        className="text-xs h-7 px-2"
        rightIcon={<ChevronDown className="w-3 h-3" />}
      >
        Действие
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg min-w-[140px] py-1">
          {transitions.map((targetStatus) => (
            <button
              key={targetStatus}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors ${
                targetStatus === "cancelled"
                  ? "text-red-600 dark:text-red-400"
                  : "text-neutral-900 dark:text-white"
              }`}
              onClick={() => {
                onStatusChange(order.id, targetStatus);
                setOpen(false);
              }}
            >
              {STATUS_LABELS[targetStatus] ?? targetStatus}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedOrders, setSelectedOrders] = useState<Set<string | number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      apiPatch(`/orders/${orderId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
  });

  const handleQuickStatusChange = (orderId: string, newStatus: string) => {
    updateStatusMutation.mutate({ orderId, status: newStatus });
  };

  const { data: ordersData, isLoading } = useAdminOrders({
    page: currentPage,
    page_size: 20,
    order_status: statusFilter !== "all" ? statusFilter : undefined,
    payment_status: paymentFilter !== "all" ? paymentFilter : undefined,
    search: searchQuery || undefined,
  });

  const orders = ordersData?.items ?? [];
  const totalOrders = ordersData?.total ?? 0;
  const totalPages = ordersData?.pages ?? 1;

  const columns: Column<AdminOrder>[] = [
    {
      key: "order_number",
      label: "Номер",
      sortable: true,
      render: (order) => (
        <Link
          href={`/admin/orders/${order.id}`}
          className="font-medium text-primary-600 dark:text-primary-400 hover:underline"
        >
          {order.order_number}
        </Link>
      ),
    },
    {
      key: "customer",
      label: "Клиент",
      sortable: true,
      render: (order) => (
        <div>
          <p className="font-medium">
            {order.customer_first_name
              ? `${order.customer_first_name} ${order.customer_last_name || ""}`
              : "—"}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {order.customer_phone ?? ""}
          </p>
        </div>
      ),
    },
    {
      key: "created_at",
      label: "Дата",
      sortable: true,
      render: (order) => (
        <div className="text-sm">
          {formatDate(order.created_at, { month: "short", day: "numeric" })}
          <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
            {new Date(order.created_at).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Статус",
      sortable: true,
      render: (order) => <StatusBadge status={order.status} />,
    },
    {
      key: "payment_status",
      label: "Оплата",
      sortable: true,
      render: (order) => <StatusBadge status={order.payment_status} />,
    },
    {
      key: "total",
      label: "Сумма",
      sortable: true,
      className: "text-right",
      render: (order) => (
        <span className="font-semibold">{formatPrice(order.total)}</span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (order) => (
        <StatusDropdown
          order={order}
          onStatusChange={handleQuickStatusChange}
          isPending={updateStatusMutation.isPending}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Заказы</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Управление заказами и их статусами
          </p>
        </div>
        <Button variant="default" leftIcon={<Plus className="w-4 h-4" />}>
          Создать заказ
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-soft border border-neutral-200 dark:border-neutral-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="search"
              placeholder="Поиск по номеру, клиенту или телефону..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-neutral-900 dark:text-white"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white"
            >
              <option value="all">Все статусы</option>
              <option value="new">Новые</option>
              <option value="confirmed">Подтверждённые</option>
              <option value="processing">В обработке</option>
              <option value="shipped">Отправленные</option>
              <option value="delivered">Доставленные</option>
              <option value="cancelled">Отменённые</option>
            </select>
          </div>

          <div>
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white"
            >
              <option value="all">Все платежи</option>
              <option value="paid">Оплачено</option>
              <option value="unpaid">Не оплачено</option>
              <option value="partial">Частично</option>
              <option value="refunded">Возврат</option>
            </select>
          </div>
        </div>

        {selectedOrders.size > 0 && (
          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 flex items-center gap-3">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Выбрано: {selectedOrders.size}
            </span>
            <Button size="sm" variant="outline">
              Экспорт выбранных
            </Button>
            <Button size="sm" variant="outline">
              Изменить статус
            </Button>
          </div>
        )}
      </div>

      {/* Results count & Export */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {isLoading ? "Загрузка..." : (
            <>Найдено заказов: <span className="font-semibold">{totalOrders}</span></>
          )}
        </p>
        <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />}>
          Экспорт
        </Button>
      </div>

      {/* Orders Table */}
      <DataTable
        columns={columns}
        data={orders}
        keyExtractor={(order) => order.id}
        showCheckbox
        selectedItems={selectedOrders}
        onSelectionChange={setSelectedOrders}
        emptyMessage={isLoading ? "Загрузка..." : "Заказы не найдены"}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between bg-white dark:bg-neutral-800 rounded-lg p-4 shadow-soft border border-neutral-200 dark:border-neutral-700">
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          Страница <span className="font-medium">{currentPage}</span> из{" "}
          <span className="font-medium">{totalPages}</span>
          {" "}({totalOrders} заказов)
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            Назад
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Вперёд
          </Button>
        </div>
      </div>
    </div>
  );
}
