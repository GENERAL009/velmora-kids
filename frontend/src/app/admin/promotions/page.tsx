"use client";

export const dynamic = "force-dynamic";

import React, { useState } from "react";
import { Tag, Percent, Hash, Plus, X } from "lucide-react";
import { DataTable, Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { useAdminPromotions, type AdminPromotion } from "@/hooks/use-admin";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function PromotionsPage() {
  const { data: promotions, isLoading } = useAdminPromotions();
  const queryClient = useQueryClient();
  const items = promotions ?? [];

  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", code: "", discount_type: "percentage", discount_value: "",
    min_order_amount: "", max_discount_amount: "", applies_to: "all",
    usage_limit: "", start_date: "", end_date: "",
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost("/promotions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "promotions"] });
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => setError(err?.response?.data?.detail || "Aksiya yaratishda xatolik"),
  });

  const resetForm = () => {
    setForm({ name: "", code: "", discount_type: "percentage", discount_value: "", min_order_amount: "", max_discount_amount: "", applies_to: "all", usage_limit: "", start_date: "", end_date: "" });
    setError("");
  };

  const handleSubmit = () => {
    if (!form.name || !form.discount_value || !form.start_date || !form.end_date) {
      setError("Nomi, chegirma va sanalar majburiy"); return;
    }
    createMutation.mutate({
      name: form.name,
      code: form.code || undefined,
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : undefined,
      max_discount_amount: form.max_discount_amount ? parseFloat(form.max_discount_amount) : undefined,
      applies_to: form.applies_to,
      usage_limit: form.usage_limit ? parseInt(form.usage_limit) : undefined,
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(form.end_date).toISOString(),
    });
  };

  const inputCls = "w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white";

  const columns: Column<AdminPromotion>[] = [
    {
      key: "name", label: "Nomi", sortable: true,
      render: (p) => <div className="flex items-center gap-2"><Tag className="h-4 w-4 text-primary-500" /><span className="font-medium">{p.name}</span></div>,
    },
    {
      key: "code", label: "Kod",
      render: (p) => p.code ? <span className="rounded bg-neutral-100 px-2 py-1 font-mono text-xs dark:bg-neutral-800">{p.code}</span> : <span className="text-neutral-400">—</span>,
    },
    {
      key: "discount", label: "Chegirma",
      render: (p) => (
        <div className="flex items-center gap-1">
          {p.discount_type === "percentage" ? (
            <><Percent className="h-3.5 w-3.5 text-green-500" /><span className="font-semibold text-green-600">{p.discount_value}%</span></>
          ) : (
            <><Hash className="h-3.5 w-3.5 text-green-500" /><span className="font-semibold text-green-600">{Number(p.discount_value).toLocaleString("uz-UZ")} so'm</span></>
          )}
        </div>
      ),
    },
    { key: "usage", label: "Ishlatilgan", render: (p) => <span>{p.used_count}{p.usage_limit ? ` / ${p.usage_limit}` : ""}</span> },
    {
      key: "period", label: "Davr",
      render: (p) => <div className="text-xs text-neutral-500"><div>{formatDate(p.start_date)}</div><div>→ {formatDate(p.end_date)}</div></div>,
    },
    { key: "is_active", label: "Holat", render: (p) => <StatusBadge status={p.is_active ? "active" : "inactive"} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Aksiyalar va promokodlar</h1>
          <p className="mt-1 text-sm text-neutral-500">Chegirmalar, aksiyalar va kuponlarni boshqarish</p>
        </div>
        <Button variant="default" leftIcon={<Plus className="w-4 h-4" />} onClick={() => { setShowModal(true); setError(""); }}>
          Aksiya yaratish
        </Button>
      </div>

      <DataTable columns={columns} data={items} keyExtractor={(p) => p.id} isLoading={isLoading} emptyMessage="Aksiyalar yo'q" />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-lg bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-elevated mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Yangi aksiya</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1 text-neutral-400 hover:text-neutral-600"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Nomi *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Yozgi chegirma" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Promokod</label>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className={inputCls + " font-mono uppercase"} placeholder="SUMMER2026" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Chegirma turi</label>
                  <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className={inputCls}>
                    <option value="percentage">Foiz (%)</option>
                    <option value="fixed">Belgilangan (so'm)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Chegirma miqdori *</label>
                  <input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} className={inputCls} placeholder={form.discount_type === "percentage" ? "10" : "50000"} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Min. buyurtma summasi</label>
                  <input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} className={inputCls} placeholder="100000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Maks. chegirma</label>
                  <input type="number" value={form.max_discount_amount} onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })} className={inputCls} placeholder="500000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Qo'llaniladi</label>
                  <select value={form.applies_to} onChange={(e) => setForm({ ...form, applies_to: e.target.value })} className={inputCls}>
                    <option value="all">Barcha tovarlar</option>
                    <option value="category">Kategoriya</option>
                    <option value="product">Mahsulot</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Foydalanish limiti</label>
                  <input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className={inputCls} placeholder="Limitsiz" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Boshlanishi *</label>
                  <input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Tugashi *</label>
                  <input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputCls} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>Bekor qilish</Button>
              <Button variant="default" onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saqlanmoqda..." : "Yaratish"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
