"use client";

export const dynamic = "force-dynamic";

import React, { useState } from "react";
import { Building2, Phone, Mail, Plus, X } from "lucide-react";
import { DataTable, Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { useAdminSuppliers, type AdminSupplier } from "@/hooks/use-admin";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function SuppliersPage() {
  const { data: suppliers, isLoading } = useAdminSuppliers();
  const queryClient = useQueryClient();
  const items = suppliers ?? [];

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", contact_person: "", phone: "", email: "", address: "" });
  const [error, setError] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost("/suppliers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "suppliers"] });
      setShowModal(false);
      setForm({ name: "", company: "", contact_person: "", phone: "", email: "", address: "" });
      setError("");
    },
    onError: (err: any) => setError(err?.response?.data?.detail || "Ошибка при создании поставщика"),
  });

  const handleSubmit = () => {
    if (!form.name || !form.phone) { setError("Название и телефон обязательны"); return; }
    createMutation.mutate({
      name: form.name, phone: form.phone,
      company: form.company || undefined,
      contact_person: form.contact_person || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
    });
  };

  const inputCls = "w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white";

  const columns: Column<AdminSupplier>[] = [
    {
      key: "name", label: "Поставщик", sortable: true,
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium">{s.name}</p>
            {s.company && <p className="text-xs text-neutral-500">{s.company}</p>}
          </div>
        </div>
      ),
    },
    { key: "contact_person", label: "Контакт", render: (s) => s.contact_person || <span className="text-neutral-400">—</span> },
    {
      key: "phone", label: "Телефон",
      render: (s) => <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-neutral-400" /><span>{s.phone}</span></div>,
    },
    {
      key: "email", label: "Email",
      render: (s) => s.email ? <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-neutral-400" /><span>{s.email}</span></div> : <span className="text-neutral-400">—</span>,
    },
    { key: "is_active", label: "Статус", render: (s) => <StatusBadge status={s.is_active ? "active" : "inactive"} /> },
    { key: "created_at", label: "Добавлен", render: (s) => <span className="text-neutral-500">{formatDate(s.created_at)}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Поставщики</h1>
          <p className="mt-1 text-sm text-neutral-500">Управление поставщиками товаров</p>
        </div>
        <Button variant="default" leftIcon={<Plus className="w-4 h-4" />} onClick={() => { setShowModal(true); setError(""); }}>
          Добавить поставщика
        </Button>
      </div>

      <DataTable columns={columns} data={items} keyExtractor={(s) => s.id} isLoading={isLoading} emptyMessage="Нет поставщиков" />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-elevated mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Новый поставщик</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-neutral-400 hover:text-neutral-600"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Название *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="ООО Текстиль" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Компания</label>
                <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Контактное лицо</label>
                <input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Телефон *</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="+998..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Email</label>
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="info@..." />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Адрес</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowModal(false)}>Отмена</Button>
              <Button variant="default" onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Сохранение..." : "Создать"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
