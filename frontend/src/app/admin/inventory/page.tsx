"use client";

export const dynamic = "force-dynamic";

import React, { useState } from "react";
import { Package, AlertTriangle, TrendingDown, Search, Plus, X, History, Edit3 } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, Column } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAdminInventory, useDashboardKPIs, useStockLogs, type StockItem, type StockLogItem } from "@/hooks/use-admin";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";

const inputCls = "w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500";

const movementTypeLabels: Record<string, string> = {
  incoming: "Приход",
  sale: "Продажа",
  pos_sale: "Касса",
  return: "Возврат",
  adjustment: "Корректировка",
};

function formatPrice(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low_stock" | "out_of_stock">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showLogsPanel, setShowLogsPanel] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<StockItem | null>(null);
  const [addQty, setAddQty] = useState(1);
  const [adjustQty, setAdjustQty] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const { data, isLoading } = useAdminInventory({
    page: currentPage,
    page_size: pageSize,
    search: searchQuery || undefined,
    low_stock: stockFilter === "low_stock" ? true : undefined,
    out_of_stock: stockFilter === "out_of_stock" ? true : undefined,
  });
  const { data: kpis } = useDashboardKPIs();
  const { data: logs = [] } = useStockLogs(selectedVariant?.id ?? "");

  const items = data?.items ?? [];
  const totalItems = data?.total ?? 0;
  const totalPages = data?.pages ?? 1;

  const addStockMutation = useMutation({
    mutationFn: (body: { variant_id: string; quantity: number; note?: string }) => apiPost("/inventory/add-stock", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stock-logs"] });
      setShowAddModal(false);
      setSelectedVariant(null);
      setAddQty(1);
      setNote("");
      setError("");
    },
    onError: (err: any) => setError(err?.response?.data?.detail || "Ошибка"),
  });

  const adjustStockMutation = useMutation({
    mutationFn: (body: { variant_id: string; new_quantity: number; note?: string }) => apiPost("/inventory/adjust-stock", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stock-logs"] });
      setShowAdjustModal(false);
      setSelectedVariant(null);
      setAdjustQty(0);
      setNote("");
      setError("");
    },
    onError: (err: any) => setError(err?.response?.data?.detail || "Ошибка"),
  });

  const handleAdd = () => {
    if (!selectedVariant) return;
    addStockMutation.mutate({ variant_id: selectedVariant.id, quantity: addQty, note: note || undefined });
  };

  const handleAdjust = () => {
    if (!selectedVariant) return;
    adjustStockMutation.mutate({ variant_id: selectedVariant.id, new_quantity: adjustQty, note: note || undefined });
  };

  const openAddModal = (item: StockItem) => {
    setSelectedVariant(item);
    setAddQty(1);
    setNote("");
    setError("");
    setShowAddModal(true);
  };

  const openAdjustModal = (item: StockItem) => {
    setSelectedVariant(item);
    setAdjustQty(item.stock);
    setNote("");
    setError("");
    setShowAdjustModal(true);
  };

  const openLogs = (item: StockItem) => {
    setSelectedVariant(item);
    setShowLogsPanel(true);
  };

  const getStockBadge = (stock: number) => {
    if (stock === 0) return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20";
    if (stock <= 5) return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20";
    return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20";
  };

  const columns: Column<StockItem>[] = [
    {
      key: "sku", label: "SKU", sortable: true,
      render: (item) => <span className="font-mono text-sm font-medium">{item.sku}</span>,
    },
    {
      key: "product", label: "Товар", sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          {item.color && (
            <span className="inline-block w-4 h-4 rounded-full border border-neutral-300 dark:border-neutral-600 flex-shrink-0" style={{ backgroundColor: item.color.hex_code }} />
          )}
          <div>
            <p className="font-medium text-neutral-900 dark:text-white">{item.product?.name ?? "—"}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.color?.name ?? "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "stock", label: "Остаток", sortable: true,
      render: (item) => (
        <span className={cn("px-2.5 py-1 rounded-full text-sm font-bold", getStockBadge(item.stock))}>
          {item.stock}
        </span>
      ),
    },
    {
      key: "actions", label: "",
      render: (item) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); openAddModal(item); }} title="Добавить"
            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); openAdjustModal(item); }} title="Корректировка"
            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
            <Edit3 className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); openLogs(item); }} title="История"
            className="p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors">
            <History className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Остатки</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">Управление запасами товаров</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Всего позиций" value={isLoading ? "..." : totalItems.toString()} icon={Package} />
        <StatCard title="Низкий остаток" value={kpis?.low_stock?.toString() ?? "..."} icon={AlertTriangle} />
        <StatCard title="Нет в наличии" value={kpis?.out_of_stock?.toString() ?? "..."} icon={TrendingDown} />
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 shadow-soft border border-neutral-200 dark:border-neutral-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="search"
              placeholder="Поиск по товару или SKU..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white"
            />
          </div>
          <select
            value={stockFilter}
            onChange={(e) => { setStockFilter(e.target.value as any); setCurrentPage(1); }}
            className={inputCls}
          >
            <option value="all">Все статусы</option>
            <option value="low_stock">Низкий остаток</option>
            <option value="out_of_stock">Нет в наличии</option>
          </select>
        </div>
      </div>

      <DataTable columns={columns} data={items} keyExtractor={(item) => item.id} emptyMessage={isLoading ? "Загрузка..." : "Позиции не найдены"} />

      <div className="flex items-center justify-between bg-white dark:bg-neutral-800 rounded-lg p-4 shadow-soft border border-neutral-200 dark:border-neutral-700">
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          Страница <span className="font-medium">{currentPage}</span> из <span className="font-medium">{totalPages}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>Назад</Button>
          <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Вперёд</Button>
        </div>
      </div>

      {/* Add Stock Modal */}
      {showAddModal && selectedVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-elevated mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Добавить товар</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-neutral-400 hover:text-neutral-600"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
            <div className="mb-4 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <p className="font-medium text-neutral-900 dark:text-white">{selectedVariant.product?.name}</p>
              <p className="text-sm text-neutral-500">{selectedVariant.sku} · {selectedVariant.color?.name} · Текущий остаток: <b>{selectedVariant.stock}</b></p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Количество *</label>
                <input type="number" min={1} value={addQty} onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value) || 1))} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Заметка</label>
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Причина прихода..." className={inputCls} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Отмена</Button>
              <Button variant="default" onClick={handleAdd} disabled={addStockMutation.isPending}>
                {addStockMutation.isPending ? "Сохранение..." : `Добавить +${addQty}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && selectedVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAdjustModal(false)}>
          <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-elevated mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Корректировка остатка</h2>
              <button onClick={() => setShowAdjustModal(false)} className="p-1 text-neutral-400 hover:text-neutral-600"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
            <div className="mb-4 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <p className="font-medium text-neutral-900 dark:text-white">{selectedVariant.product?.name}</p>
              <p className="text-sm text-neutral-500">{selectedVariant.sku} · {selectedVariant.color?.name} · Текущий остаток: <b>{selectedVariant.stock}</b></p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Новое количество *</label>
                <input type="number" min={0} value={adjustQty} onChange={(e) => setAdjustQty(Math.max(0, parseInt(e.target.value) || 0))} className={inputCls} />
                {adjustQty !== selectedVariant.stock && (
                  <p className={cn("text-xs mt-1", adjustQty > selectedVariant.stock ? "text-green-600" : "text-red-600")}>
                    {adjustQty > selectedVariant.stock ? `+${adjustQty - selectedVariant.stock}` : `${adjustQty - selectedVariant.stock}`} шт.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Причина *</label>
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Причина корректировки..." className={inputCls} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowAdjustModal(false)}>Отмена</Button>
              <Button variant="default" onClick={handleAdjust} disabled={adjustStockMutation.isPending || !note.trim()}>
                {adjustStockMutation.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Logs Panel */}
      {showLogsPanel && selectedVariant && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setShowLogsPanel(false)}>
          <div className="w-full max-w-lg bg-white dark:bg-neutral-800 h-full overflow-y-auto shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 p-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">История движения</h2>
                <p className="text-sm text-neutral-500">{selectedVariant.product?.name} · {selectedVariant.color?.name}</p>
              </div>
              <button onClick={() => setShowLogsPanel(false)} className="p-1 text-neutral-400 hover:text-neutral-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              {logs.length === 0 && <p className="text-neutral-500 text-sm text-center py-8">Нет записей</p>}
              {logs.map((log: StockLogItem) => (
                <div key={log.id} className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full",
                      log.quantity > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    )}>
                      {movementTypeLabels[log.movement_type] ?? log.movement_type}
                    </span>
                    <span className="text-xs text-neutral-400">{new Date(log.created_at).toLocaleString("ru-RU")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-neutral-500">{log.stock_before}</span>
                    <span className="text-neutral-400">&rarr;</span>
                    <span className="font-bold text-neutral-900 dark:text-white">{log.stock_after}</span>
                    <span className={cn("font-medium", log.quantity > 0 ? "text-green-600" : "text-red-600")}>
                      ({log.quantity > 0 ? "+" : ""}{log.quantity})
                    </span>
                  </div>
                  {log.note && <p className="text-xs text-neutral-500 mt-1">{log.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
