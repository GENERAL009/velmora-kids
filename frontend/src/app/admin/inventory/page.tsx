"use client";

export const dynamic = "force-dynamic";

import React, { useState } from "react";
import { Package, AlertTriangle, TrendingUp, Warehouse, Search, Download, Plus, X, Trash2 } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, Column } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAdminInventory, useDashboardKPIs, useAdminSuppliers, type InventoryItem } from "@/hooks/use-admin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiGet } from "@/lib/api";

interface ReceiveItem {
  product_variant_id: string;
  quantity: number;
  purchase_price: number;
  warehouse_id: string;
}

interface WarehouseOption { id: string; name: string; }
interface VariantOption { id: string; sku: string; product?: { name: string }; size?: { name: string }; color?: { name: string } }

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low_stock" | "out_of_stock">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [receiveNotes, setReceiveNotes] = useState("");
  const [receiveItems, setReceiveItems] = useState<ReceiveItem[]>([{ product_variant_id: "", quantity: 1, purchase_price: 0, warehouse_id: "" }]);
  const [error, setError] = useState("");

  const { data, isLoading } = useAdminInventory({ page: currentPage, page_size: pageSize, low_stock: stockFilter === "low_stock" ? true : undefined, out_of_stock: stockFilter === "out_of_stock" ? true : undefined });
  const { data: kpis } = useDashboardKPIs();
  const { data: suppliers = [] } = useAdminSuppliers();
  const { data: warehouses = [] } = useQuery({ queryKey: ["warehouses"], queryFn: () => apiGet<WarehouseOption[]>("/warehouses"), retry: 1 });

  const inventoryItems = data?.items ?? [];
  const totalItems = data?.total ?? 0;
  const totalPages = data?.pages ?? 1;

  const filteredInventory = searchQuery
    ? inventoryItems.filter((item) => {
        const q = searchQuery.toLowerCase();
        return (item.product_variant?.product?.name ?? "").toLowerCase().includes(q) || (item.product_variant?.sku ?? "").toLowerCase().includes(q);
      })
    : inventoryItems;

  const receiveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost("/inventory/receive", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      setShowReceiveModal(false);
      setSupplierId(""); setReceiveNotes(""); setReceiveItems([{ product_variant_id: "", quantity: 1, purchase_price: 0, warehouse_id: "" }]);
      setError("");
    },
    onError: (err: any) => setError(err?.response?.data?.detail || "Ошибка при приёмке товара"),
  });

  const handleReceive = () => {
    if (!supplierId) { setError("Выберите поставщика"); return; }
    const validItems = receiveItems.filter(i => i.product_variant_id && i.quantity > 0 && i.warehouse_id);
    if (validItems.length === 0) { setError("Добавьте хотя бы одну позицию"); return; }
    receiveMutation.mutate({ supplier_id: supplierId, items: validItems, notes: receiveNotes || undefined });
  };

  const addReceiveItem = () => setReceiveItems([...receiveItems, { product_variant_id: "", quantity: 1, purchase_price: 0, warehouse_id: warehouses[0]?.id || "" }]);
  const removeReceiveItem = (idx: number) => setReceiveItems(receiveItems.filter((_, i) => i !== idx));
  const updateReceiveItem = (idx: number, field: keyof ReceiveItem, value: string | number) => {
    const updated = [...receiveItems];
    (updated[idx] as any)[field] = value;
    setReceiveItems(updated);
  };

  const getStockStatusColor = (available: number) => {
    if (available === 0) return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10";
    if (available < 10) return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/10";
    return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/10";
  };

  const variantOptions: VariantOption[] = inventoryItems.map(i => i.product_variant).filter(Boolean) as VariantOption[];

  const inputCls = "w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white";

  const columns: Column<InventoryItem>[] = [
    { key: "sku", label: "SKU", sortable: true, render: (item) => <span className="font-mono text-sm font-medium">{item.product_variant?.sku ?? "—"}</span> },
    {
      key: "product", label: "Товар", sortable: true,
      render: (item) => (
        <div>
          <p className="font-medium">{item.product_variant?.product?.name ?? "—"}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.product_variant?.size?.name ?? "—"} / {item.product_variant?.color?.name ?? "—"}</p>
        </div>
      ),
    },
    { key: "quantity", label: "Всего", sortable: true, render: (item) => <span className="font-semibold">{item.quantity}</span> },
    { key: "reserved", label: "Резерв", sortable: true, render: (item) => <span className="text-orange-600 dark:text-orange-400 font-medium">{item.reserved}</span> },
    {
      key: "available", label: "Доступно", sortable: true,
      render: (item) => {
        const available = item.quantity - item.reserved;
        return <span className={cn("px-2 py-1 rounded-full text-sm font-semibold", getStockStatusColor(available))}>{available}</span>;
      },
    },
    { key: "warehouse", label: "Склад", sortable: true, render: (item) => <span>{item.warehouse?.name ?? "—"}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Склад</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">Управление остатками и запасами</p>
        </div>
        <Button variant="default" leftIcon={<Plus className="w-4 h-4" />} onClick={() => { setShowReceiveModal(true); setError(""); }}>
          Принять товар
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Всего позиций" value={isLoading ? "..." : totalItems.toString()} icon={Package} />
        <StatCard title="Низкий остаток" value={kpis?.low_stock?.toString() ?? "..."} icon={AlertTriangle} />
        <StatCard title="Нет в наличии" value={kpis?.out_of_stock?.toString() ?? "..."} icon={TrendingUp} />
        <StatCard title="Товаров в каталоге" value={kpis?.total_products?.toString() ?? "..."} icon={Warehouse} />
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-soft border border-neutral-200 dark:border-neutral-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input type="search" placeholder="Поиск по товару или SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white" />
          </div>
          <select value={stockFilter} onChange={(e) => { setStockFilter(e.target.value as any); setCurrentPage(1); }} className={inputCls}>
            <option value="all">Все статусы</option>
            <option value="low_stock">Низкий остаток</option>
            <option value="out_of_stock">Нет в наличии</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {isLoading ? "Загрузка..." : <>Найдено: <span className="font-semibold">{filteredInventory.length}</span></>}
        </p>
        <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />}>Экспорт</Button>
      </div>

      <DataTable columns={columns} data={filteredInventory} keyExtractor={(item) => item.id} emptyMessage={isLoading ? "Загрузка..." : "Позиции не найдены"} />

      <div className="flex items-center justify-between bg-white dark:bg-neutral-800 rounded-lg p-4 shadow-soft border border-neutral-200 dark:border-neutral-700">
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          Страница <span className="font-medium">{currentPage}</span> из <span className="font-medium">{totalPages}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>Назад</Button>
          <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Вперёд</Button>
        </div>
      </div>

      {/* Receive Stock Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowReceiveModal(false)}>
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-elevated mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Приёмка товара</h2>
              <button onClick={() => setShowReceiveModal(false)} className="p-1 text-neutral-400 hover:text-neutral-600"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Поставщик *</label>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputCls}>
                  <option value="">Выберите поставщика</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Позиции *</label>
                  <Button variant="outline" size="sm" leftIcon={<Plus className="w-3 h-3" />} onClick={addReceiveItem}>Добавить</Button>
                </div>
                <div className="space-y-3">
                  {receiveItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs text-neutral-500 mb-1">Вариант (SKU)</label>
                          <select value={item.product_variant_id} onChange={(e) => updateReceiveItem(idx, "product_variant_id", e.target.value)}
                            className="w-full px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs text-neutral-900 dark:text-white">
                            <option value="">Выберите...</option>
                            {variantOptions.map((v) => <option key={v.id} value={v.id}>{v.sku} — {v.product?.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-500 mb-1">Кол-во</label>
                          <input type="number" min={1} value={item.quantity} onChange={(e) => updateReceiveItem(idx, "quantity", parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs text-neutral-900 dark:text-white" />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="block text-xs text-neutral-500 mb-1">Закуп. цена</label>
                            <input type="number" min={0} value={item.purchase_price || ""} onChange={(e) => updateReceiveItem(idx, "purchase_price", parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs text-neutral-900 dark:text-white" />
                          </div>
                          {receiveItems.length > 1 && (
                            <button onClick={() => removeReceiveItem(idx)} className="self-end p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-2">
                        <label className="block text-xs text-neutral-500 mb-1">Склад</label>
                        <select value={item.warehouse_id} onChange={(e) => updateReceiveItem(idx, "warehouse_id", e.target.value)}
                          className="w-full px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs text-neutral-900 dark:text-white">
                          <option value="">Выберите склад</option>
                          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Заметки</label>
                <textarea value={receiveNotes} onChange={(e) => setReceiveNotes(e.target.value)} rows={2} className={inputCls + " resize-none"} />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowReceiveModal(false)}>Отмена</Button>
              <Button variant="default" onClick={handleReceive} disabled={receiveMutation.isPending}>
                {receiveMutation.isPending ? "Приёмка..." : "Принять товар"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
