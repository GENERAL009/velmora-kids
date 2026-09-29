"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { FolderTree, Plus, X, Pencil, Trash2, Upload } from "lucide-react";
import { useCategories } from "@/hooks/use-products";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiPut, apiDelete } from "@/lib/api";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
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
    image: "", parent_id: "", sort_order: 0, is_active: true,
  });
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setForm({ name: "", name_uz: "", name_en: "", slug: "", description: "", image: "", parent_id: "", sort_order: 0, is_active: true });
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
      image: cat.image || "",
      parent_id: cat.parent_id || "",
      sort_order: cat.sort_order,
      is_active: cat.is_active,
    });
    setShowModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/categories/upload-image", formData);
      setForm((f) => ({ ...f, image: res.data.url }));
    } catch {
      toast.error("Rasm yuklanmadi");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost("/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setShowModal(false);
      resetForm();
      toast.success("Kategoriya yaratildi");
    },
    onError: (err: any) => setError(err?.response?.data?.detail || "Xatolik yuz berdi"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiPut(`/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setShowModal(false);
      resetForm();
      toast.success("Kategoriya yangilandi");
    },
    onError: (err: any) => setError(err?.response?.data?.detail || "Xatolik yuz berdi"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Kategoriya o'chirildi");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || "Kategoriyani o'chirib bo'lmadi";
      toast.error(msg);
    },
  });

  const handleSubmit = () => {
    if (!form.name || !form.slug) { setError("Nom va slug majburiy"); return; }
    if (!form.image) { setError("Rasm majburiy"); return; }
    const payload = {
      name: form.name,
      name_uz: form.name_uz || undefined,
      name_en: form.name_en || undefined,
      name_ru: form.name,
      slug: form.slug,
      description: form.description || undefined,
      image: form.image,
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
    if (confirm("Kategoriyani o'chirmoqchimisiz?")) deleteMutation.mutate(id);
  };

  const parents = categories.filter((c: Category) => !c.parent_id);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Kategoriyalar</h1>
          <p className="mt-1 text-sm text-neutral-500">{categories.length} ta kategoriya</p>
        </div>
        <Button variant="default" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
          Kategoriya qo'shish
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Kategoriya</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Slug</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Tartib</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Holat</th>
              <th className="px-4 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">Amallar</th>
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
                    <div className="flex items-center gap-3">
                      {parent.image ? (
                        <div className="relative h-9 w-9 overflow-hidden rounded-lg">
                          <Image src={parent.image} alt={parent.name} fill className="object-cover" unoptimized />
                        </div>
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
                          <FolderTree className="h-4 w-4 text-primary-500" />
                        </div>
                      )}
                      <span className="font-semibold text-neutral-900 dark:text-white">{parent.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-500">{parent.slug}</td>
                  <td className="px-4 py-3 text-neutral-500">{parent.sort_order}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", parent.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")}>
                      {parent.is_active ? "Faol" : "Yashirin"}
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
                        <div className="flex items-center gap-3">
                          {child.image ? (
                            <div className="relative h-8 w-8 overflow-hidden rounded-lg">
                              <Image src={child.image} alt={child.name} fill className="object-cover" unoptimized />
                            </div>
                          ) : null}
                          <span className="text-neutral-700 dark:text-neutral-300">└ {child.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-500">{child.slug}</td>
                      <td className="px-4 py-3 text-neutral-500">{child.sort_order}</td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", child.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")}>
                          {child.is_active ? "Faol" : "Yashirin"}
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
            {!isLoading && categories.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-500">Kategoriyalar topilmadi</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-elevated mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                {editingCategory ? "Kategoriyani tahrirlash" : "Yangi kategoriya"}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}

            <div className="space-y-4">
              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Rasm *</label>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                {form.image ? (
                  <div className="relative group w-full h-32 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
                    <Image src={form.image} alt="Category" fill className="object-cover" unoptimized />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-neutral-700"
                      >
                        Almashtirish
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, image: "" }))}
                        className="rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        O'chirish
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-600 py-8 text-sm text-neutral-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
                  >
                    <Upload className="h-5 w-5" />
                    {uploading ? "Yuklanmoqda..." : "Rasm yuklash"}
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Nomi (RU) *</label>
                <input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value, slug: editingCategory ? form.slug : generateSlug(e.target.value) }); }} className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white" placeholder="Elektromobil" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Nomi (UZ)</label>
                  <input value={form.name_uz} onChange={(e) => setForm({ ...form, name_uz: e.target.value })} className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white" placeholder="Elektromobil" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Nomi (EN)</label>
                  <input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white" placeholder="Electric car" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Slug *</label>
                <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-mono text-neutral-900 dark:text-white" placeholder="elektromobil" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Tavsif</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Ota kategoriya</label>
                  <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })} className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white">
                    <option value="">Yo'q (asosiy)</option>
                    {categories.filter((c: Category) => c.id !== editingCategory?.id).map((c: Category) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Tartib</label>
                  <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Faol</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>Bekor qilish</Button>
              <Button variant="default" onClick={handleSubmit} disabled={isSaving || uploading}>
                {isSaving ? "Saqlanmoqda..." : editingCategory ? "Saqlash" : "Yaratish"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
