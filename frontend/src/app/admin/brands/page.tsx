"use client";

import React, { useState } from "react";
import { Palette, Plus, X, Pencil, Trash2 } from "lucide-react";
import { useBrands } from "@/hooks/use-products";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiPut, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";

function generateSlug(name: string): string {
  const map: Record<string, string> = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i',
    'й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t',
    'у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y',
    'ь':'','э':'e','ю':'yu','я':'ya',' ':'-'
  };
  return name.toLowerCase().split('').map(c => map[c] ?? c).join('')
    .replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  description?: string | null;
  is_active: boolean;
  created_at: string;
}

export default function BrandsPage() {
  const { data: brands = [], isLoading } = useBrands() as unknown as { data: Brand[]; isLoading: boolean };
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", logo: "", is_active: true });
  const [error, setError] = useState("");

  const resetForm = () => { setForm({ name: "", slug: "", description: "", logo: "", is_active: true }); setError(""); setEditingBrand(null); };

  const openCreate = () => { resetForm(); setShowModal(true); };

  const openEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setForm({
      name: brand.name,
      slug: brand.slug,
      description: brand.description || "",
      logo: brand.logo || "",
      is_active: brand.is_active,
    });
    setShowModal(true);
  };

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost("/brands", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => setError(err?.response?.data?.detail || "Ошибка при создании бренда"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiPut(`/brands/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => setError(err?.response?.data?.detail || "Ошибка при обновлении"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/brands/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brands"] }),
  });

  const handleSubmit = () => {
    if (!form.name || !form.slug) { setError("Название и slug обязательны"); return; }
    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description || undefined,
      logo: form.logo || undefined,
      is_active: form.is_active,
    };
    if (editingBrand) {
      updateMutation.mutate({ id: editingBrand.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Удалить бренд?")) deleteMutation.mutate(id);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Бренды</h1>
          <p className="mt-1 text-sm text-neutral-500">{brands.length} брендов</p>
        </div>
        <Button variant="default" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
          Добавить бренд
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Бренд</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Slug</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Описание</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Статус</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Добавлен</th>
              <th className="px-4 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <tr key={i}><td colSpan={6} className="px-4 py-4"><div className="h-4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" /></td></tr>
            ))}
            {brands.map((brand) => (
              <tr key={brand.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
                      <Palette className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <span className="font-medium text-neutral-900 dark:text-white">{brand.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-500">{brand.slug}</td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 max-w-xs truncate">{brand.description || "—"}</td>
                <td className="px-4 py-3">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", brand.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")}>
                    {brand.is_active ? "Активен" : "Скрыт"}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-500">{formatDate(brand.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(brand)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(brand.id)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && brands.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-500">Бренды не найдены</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-elevated mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                {editingBrand ? "Изменить бренд" : "Новый бренд"}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1 text-neutral-400 hover:text-neutral-600"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Название *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editingBrand ? form.slug : generateSlug(e.target.value) })} className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white" placeholder="Nike Kids" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Slug *</label>
                <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-mono text-neutral-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Описание</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Logo URL</label>
                <input value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white" placeholder="https://..." />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Активен</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>Отмена</Button>
              <Button variant="default" onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? "Сохранение..." : editingBrand ? "Сохранить" : "Создать"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
