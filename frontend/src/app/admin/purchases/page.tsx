"use client";

export const dynamic = "force-dynamic";

import React, { useState } from "react";
import { Truck, ChevronRight, Package, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/status-badge";
import { useAdminSuppliers, type AdminSupplier } from "@/hooks/use-admin";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface PurchaseItem {
  id: string;
  product_variant_id: string;
  quantity: number;
  purchase_price: string | number;
  product_variant?: { sku: string; product?: { name: string } };
}

interface Purchase {
  id: string;
  supplier_id: string;
  status: string;
  total_amount: string | number;
  notes?: string;
  created_at: string;
  items?: PurchaseItem[];
}

export default function PurchasesPage() {
  const { data: suppliers = [], isLoading } = useAdminSuppliers();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  const { data: purchases = [], isLoading: purchasesLoading } = useQuery({
    queryKey: ["admin", "supplier-purchases", selectedSupplierId],
    queryFn: () => apiGet<Purchase[]>(`/suppliers/${selectedSupplierId}/purchases`),
    enabled: !!selectedSupplierId,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Закупки</h1>
        <p className="mt-1 text-sm text-neutral-500">Управление закупками у поставщиков</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
            <div className="h-5 w-32 rounded bg-neutral-200 dark:bg-neutral-700" />
            <div className="mt-3 h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
          </div>
        ))}
        {suppliers.map((supplier) => (
          <button
            key={supplier.id}
            onClick={() => setSelectedSupplierId(supplier.id)}
            className="rounded-xl border border-neutral-200 bg-white p-5 text-left transition-all hover:shadow-md hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-primary-600"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">{supplier.name}</p>
                  {supplier.company && <p className="text-xs text-neutral-500">{supplier.company}</p>}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs text-neutral-500">
              {supplier.contact_person && <span>{supplier.contact_person}</span>}
              <span>{supplier.phone}</span>
            </div>
            <div className="mt-2">
              <StatusBadge status={supplier.is_active ? "active" : "inactive"} />
            </div>
          </button>
        ))}
        {!isLoading && suppliers.length === 0 && (
          <div className="col-span-full py-12 text-center text-neutral-500">
            Нет поставщиков. Добавьте поставщика в разделе «Поставщики».
          </div>
        )}
      </div>

      {/* Purchases Modal for Selected Supplier */}
      {selectedSupplierId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedSupplierId(null)}>
          <div className="w-full max-w-3xl bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-elevated mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Закупки: {selectedSupplier?.name}
                </h2>
                {selectedSupplier?.company && <p className="text-sm text-neutral-500">{selectedSupplier.company}</p>}
              </div>
              <button onClick={() => setSelectedSupplierId(null)} className="p-1 text-neutral-400 hover:text-neutral-600"><X className="w-5 h-5" /></button>
            </div>

            {purchasesLoading ? (
              <div className="text-center py-8 text-neutral-500">Загрузка...</div>
            ) : purchases.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-neutral-300 dark:text-neutral-600" />
                <p className="mt-3 text-neutral-500">Нет записей о закупках у данного поставщика</p>
              </div>
            ) : (
              <div className="space-y-4">
                {purchases.map((purchase) => (
                  <div key={purchase.id} className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={purchase.status} />
                        <span className="text-sm font-semibold">
                          {Number(purchase.total_amount).toLocaleString("ru-RU")} сум
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-neutral-500">
                        <Calendar className="h-3 w-3" />
                        {formatDate(purchase.created_at)}
                      </span>
                    </div>
                    {purchase.notes && <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{purchase.notes}</p>}
                    {purchase.items && purchase.items.length > 0 && (
                      <div className="mt-3 border-t border-neutral-100 dark:border-neutral-700 pt-3">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-neutral-500">
                              <th className="text-left pb-1 font-medium">Товар</th>
                              <th className="text-right pb-1 font-medium">Кол-во</th>
                              <th className="text-right pb-1 font-medium">Цена</th>
                              <th className="text-right pb-1 font-medium">Сумма</th>
                            </tr>
                          </thead>
                          <tbody>
                            {purchase.items.map((item) => (
                              <tr key={item.id} className="text-neutral-700 dark:text-neutral-300">
                                <td className="py-1">{item.product_variant?.product?.name ?? item.product_variant?.sku ?? "—"}</td>
                                <td className="py-1 text-right">{item.quantity}</td>
                                <td className="py-1 text-right">{Number(item.purchase_price).toLocaleString("ru-RU")}</td>
                                <td className="py-1 text-right font-medium">{(item.quantity * Number(item.purchase_price)).toLocaleString("ru-RU")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
