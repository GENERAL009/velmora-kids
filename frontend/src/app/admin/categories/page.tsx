"use client";

import React, { useState } from "react";
import { FolderTree, Plus, X, Pencil, Trash2 } from "lucide-react";
import { useCategories } from "@/hooks/use-products";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiPut, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

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

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useCategories();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState({
    name: "", name_uz: "", name_en: "", slug: "", description: "",
    parent_id: "", sort_order: 0, is_active: true,
  });
  const [error, setError] = useState("");

  const resetForm = () => {
    setForm({ name: "", name_uz: "", name_en: "", slug: "", description: "", parent_id: "", sort_order: 0, is_active: true });
    setError("");
    setEditingCategory(null);
  };

  const openCreate = () => { resetForm(); setShowModal(true); };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setForm({
      name: cat.name,
      name_uz: (cat as any).name_uz || "",
      name_en: (cat as any).name_en || "",
      slug: cat.slug,
      description: cat.description || "",
      parent_id: cat.parent_id || "",
      sort_order: cat.sort_order,
      is_active: cat.is_active,
    });
    setShowModal(true);
  };

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost("/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => setError(err?.response?.data?.detail || "Ошибка при создании категории"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiPut(`/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => setError(err?.response?.data?.detail || "Ошибка при обновлении"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const handleSubmit = () => {
    if (!form.name || !form.slug) { setError("Название и slug обязательны"); return; }
    const payload = {
      name: form.name,
      name_uz: form.name_uz || undefined,
      name_en: form.name_en || undefined,
      name_ru: form.name,
      slug: form.slug,
      description: form.description || undefined,
      parent_id: form.parent_id || undefined,
      sort_order: form.sort_order,
      is_active: form.is_active,
    };
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Удалить категорию?")) deleteMutation.mutate(id);
  };

  const parents = categories.filter((c: Category) => !c.parent_id);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Категории</h1>
          <p className="mt-1 text-sm text-neutral-500">{categories.length} категорий</p>
        </div>
        <Button variant="default" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
          Добавить категорию
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Категория</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Slug</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Порядок</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Статус</th>
              <th className="px-4 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}><td colSpan={5} className="px-4 py-4"><div className="h-4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" /></td></tr>
            ))}
            {parents.map((parent: Category) => (
              <React.Fragment key={parent.id}>
                <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-primary-500" />
                      <span className="font-semibold text-neutral-900 dark:text-white">{parent.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-500">{parent.slug}</td>
                  <td className="px-4 py-3 text-neutral-500">{parent.sort_order}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", parent.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")}>
                      {parent.is_active ? "Активна" : "Скрыта"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(parent)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(parent.id)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {categories
                  .filter((c: Category) => c.parent_id === parent.id)
                  .map((child: Category) => (
                    <tr key={child.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <td className="px-4 py-3 pl-10">
                        <span className="text-neutral-700 dark:text-neutral-300">└ {child.name}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-500">{child.slug}</td>
                      <td className="px-4 py-3 text-neutral-500">{child.sort_order}</td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", child.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")}>
                          {child.is_active ? "Активна" : "Скрыта"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(child)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(child.id)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="w-full max-w-lg bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-elevated mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                {editingCategory ? "Изменить категорию" : "Новая категория"}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Название (RU) *</label>
                <input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value, slug: editingCategory ? form.slug : generateSlug(e.target.value) }); }} className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white" placeholder="Платья" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Название (UZ)</label>
                  <input value={form.name_uz} onChange={(e) => setForm({ ...form, name_uz: e.target.value })} className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white" placeholder="Ko'ylaklar" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Название (EN)</label>
                  <input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white" placeholder="Dresses" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Slug *</label>
                <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-mono text-neutral-900 dark:text-white" placeholder="platya" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Описание</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Родительская категория</label>
                  <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })} className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white">
                    <option value="">Нет (корневая)</option>
                    {categories.filter((c: Category) => c.id !== editingCategory?.id).map((c: Category) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Порядок</label>
                  <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Активна</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>Отмена</Button>
              <Button variant="default" onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? "Сохранение..." : editingCategory ? "Сохранить" : "Создать"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
