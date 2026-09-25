"use client";

export const dynamic = "force-dynamic";

import React, { useState } from "react";
import { Search, Download, Phone, Mail, Eye, X, ShoppingBag } from "lucide-react";
import { DataTable, Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { useAdminCustomers, type AdminCustomer } from "@/hooks/use-admin";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

interface CustomerOrder {
  id: string;
  order_number: string;
  status: string;
  total: string | number;
  created_at: string;
  items?: { id: string; product_name: string; quantity: number; price: string | number }[];
}

interface CustomerDetail {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  addresses?: { id: string; city: string; address_line: string; is_default: boolean }[];
}

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const { data, isLoading } = useAdminCustomers({ search: searchQuery || undefined, page: currentPage, page_size: pageSize });
  const customers = data?.items ?? [];
  const totalCustomers = data?.total ?? 0;
  const totalPages = data?.pages ?? 1;

  const { data: customerDetail } = useQuery({
    queryKey: ["admin", "customer", selectedCustomerId],
    queryFn: () => apiGet<CustomerDetail>(`/customers/${selectedCustomerId}`),
    enabled: !!selectedCustomerId,
  });

  const { data: customerOrders = [] } = useQuery({
    queryKey: ["admin", "customer-orders", selectedCustomerId],
    queryFn: () => apiGet<CustomerOrder[]>(`/customers/${selectedCustomerId}/orders`),
    enabled: !!selectedCustomerId,
  });

  const columns: Column<AdminCustomer>[] = [
    {
      key: "name", label: "Клиент", sortable: true,
      render: (customer) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400 font-semibold">
            {customer.first_name.charAt(0)}
          </div>
          <div>
            <p className="font-medium">{customer.first_name} {customer.last_name}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Регистрация: {formatDate(customer.created_at, { month: "short", day: "numeric", year: "numeric" })}</p>
          </div>
        </div>
      ),
    },
    {
      key: "contact", label: "Контакты",
      render: (customer) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm"><Phone className="w-3 h-3 text-neutral-400" /><span>{customer.phone}</span></div>
          {customer.email && <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400"><Mail className="w-3 h-3" /><span className="truncate max-w-[200px]">{customer.email}</span></div>}
        </div>
      ),
    },
    { key: "status", label: "Статус", sortable: true, render: (customer) => <StatusBadge status={customer.is_active ? "active" : "inactive"} /> },
    { key: "created_at", label: "Дата регистрации", sortable: true, render: (customer) => <span className="text-sm">{formatDate(customer.created_at, { month: "short", day: "numeric", year: "numeric" })}</span> },
    {
      key: "actions", label: "Действия",
      render: (customer) => (
        <button onClick={(e) => { e.stopPropagation(); setSelectedCustomerId(customer.id); }}
          className="p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors" title="Просмотр">
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Клиенты</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">База клиентов и история покупок</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Всего клиентов</p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">{isLoading ? "..." : totalCustomers}</p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Активные</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{isLoading ? "..." : customers.filter((c) => c.is_active).length}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-soft border border-neutral-200 dark:border-neutral-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input type="search" placeholder="Поиск по имени, телефону или email..." value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {isLoading ? "Загрузка..." : <>Найдено клиентов: <span className="font-semibold">{totalCustomers}</span></>}
        </p>
        <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />}>Экспорт</Button>
      </div>

      <DataTable columns={columns} data={customers} keyExtractor={(customer) => customer.id} emptyMessage={isLoading ? "Загрузка..." : "Клиенты не найдены"} />

      <div className="flex items-center justify-between bg-white dark:bg-neutral-800 rounded-lg p-4 shadow-soft border border-neutral-200 dark:border-neutral-700">
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          Страница <span className="font-medium">{currentPage}</span> из <span className="font-medium">{totalPages}</span> ({totalCustomers} всего)
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>Назад</Button>
          <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Вперёд</Button>
        </div>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedCustomerId(null)}>
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-elevated mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Карточка клиента</h2>
              <button onClick={() => setSelectedCustomerId(null)} className="p-1 text-neutral-400 hover:text-neutral-600"><X className="w-5 h-5" /></button>
            </div>

            {customerDetail ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400 text-2xl font-bold">
                    {customerDetail.first_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{customerDetail.first_name} {customerDetail.last_name}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-neutral-500">
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{customerDetail.phone}</span>
                      {customerDetail.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{customerDetail.email}</span>}
                    </div>
                    <div className="mt-1"><StatusBadge status={customerDetail.is_active ? "active" : "inactive"} /></div>
                  </div>
                </div>

                {customerDetail.addresses && customerDetail.addresses.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Адреса</h4>
                    <div className="space-y-2">
                      {customerDetail.addresses.map((addr) => (
                        <div key={addr.id} className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg text-sm">
                          <span>{addr.city}, {addr.address_line}</span>
                          {addr.is_default && <span className="ml-2 text-xs bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 px-2 py-0.5 rounded-full">По умолчанию</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" /> Заказы ({customerOrders.length})
                  </h4>
                  {customerOrders.length === 0 ? (
                    <p className="text-sm text-neutral-500">Нет заказов</p>
                  ) : (
                    <div className="space-y-2">
                      {customerOrders.map((order) => (
                        <div key={order.id} className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg flex items-center justify-between">
                          <div>
                            <span className="font-medium text-primary-600 dark:text-primary-400">{order.order_number}</span>
                            <span className="ml-3 text-xs text-neutral-500">{formatDate(order.created_at)}</span>
                            {order.items && <span className="ml-2 text-xs text-neutral-400">({order.items.length} поз.)</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusBadge status={order.status} />
                            <span className="font-semibold text-sm">{Number(order.total).toLocaleString("ru-RU")} сум</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500">Загрузка...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
