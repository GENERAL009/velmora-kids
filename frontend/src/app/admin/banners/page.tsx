"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { Plus, X, Trash2, Image as ImageIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Banner } from "@/types";

export default function BannersPage() {
  const queryClient = useQueryClient();
  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["banners-admin"],
    queryFn: () => apiGet<Banner[]>("/banners/all"),
  });

  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    image: "",
    link: "",
    position: "hero",
    sort_order: 0,
    is_active: true,
  });
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setForm({ title: "", subtitle: "", image: "", link: "", position: "hero", sort_order: 0, is_active: true });
    setError("");
    setEditingBanner(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle || "",
      image: banner.image,
      link: banner.link || "",
      position: banner.position,
      sort_order: banner.sort_order,
      is_active: banner.is_active,
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
      const res = await api.post("/banners/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((prev) => ({ ...prev, image: res.data.url }));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Ошибка загрузки изображения");
    } finally {
      setUploading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost("/banners", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners-admin"] });
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => setError(err?.response?.data?.detail || "Ошибка"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiPut(`/banners/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners-admin"] });
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => setError(err?.response?.data?.detail || "Ошибка"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/banners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners-admin"] });
      queryClient.invalidateQueries({ queryKey: ["banners"] });
    },
  });

  const handleSubmit = () => {
    if (!form.title) { setError("Название обязательно"); return; }
    if (!form.image) { setError("Загрузите изображение"); return; }

    const payload = {
      title: form.title,
      subtitle: form.subtitle || undefined,
      image: form.image,
      link: form.link || undefined,
      position: form.position,
      sort_order: form.sort_order,
      is_active: form.is_active,
    };

    if (editingBanner) {
      updateMutation.mutate({ id: editingBanner.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Удалить баннер?")) {
      deleteMutation.mutate(id);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Баннеры</h1>
          <p className="mt-1 text-sm text-neutral-500">{banners.length} баннеров</p>
        </div>
        <Button variant="default" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
          Добавить баннер
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="aspect-video animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-700" />
          ))}

        {banners.map((banner) => (
          <div
            key={banner.id}
            className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
          >
            <div className="relative aspect-video bg-neutral-100 dark:bg-neutral-800">
              {banner.image ? (
                <Image
                  src={banner.image}
                  alt={banner.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-neutral-300 dark:text-neutral-600" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-2 left-3 right-3">
                <p className="text-sm font-bold text-white drop-shadow">{banner.title}</p>
                {banner.subtitle && (
                  <p className="text-xs text-white/70">{banner.subtitle}</p>
                )}
              </div>

              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => openEdit(banner)}
                  className="rounded-lg bg-white/90 px-2 py-1 text-xs font-medium text-neutral-700 shadow hover:bg-white"
                >
                  Изменить
                </button>
                <button
                  onClick={() => handleDelete(banner.id)}
                  className="rounded-lg bg-red-500/90 p-1.5 text-white shadow hover:bg-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    banner.is_active
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  )}
                >
                  {banner.is_active ? "Активен" : "Скрыт"}
                </span>
                <span className="text-xs text-neutral-400">{banner.position}</span>
              </div>
              <span className="text-xs text-neutral-400">#{banner.sort_order}</span>
            </div>
          </div>
        ))}

        {!isLoading && banners.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 py-12 dark:border-neutral-700">
            <ImageIcon className="mb-3 h-12 w-12 text-neutral-300 dark:text-neutral-600" />
            <p className="text-neutral-500">Баннеры не найдены</p>
            <Button variant="outline" className="mt-4" onClick={openCreate}>
              Добавить первый баннер
            </Button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowModal(false); resetForm(); }}>
          <div
            className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-elevated dark:bg-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                {editingBanner ? "Изменить баннер" : "Новый баннер"}
              </h2>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="p-1 text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Изображение *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {form.image ? (
                  <div className="relative aspect-video overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <Image src={form.image} alt="Preview" fill className="object-cover" unoptimized />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-neutral-700 shadow hover:bg-white"
                    >
                      Заменить
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 py-8 text-neutral-400 transition-colors hover:border-primary-400 hover:text-primary-500 dark:border-neutral-600"
                  >
                    <ImageIcon className="mb-2 h-8 w-8" />
                    <span className="text-sm">{uploading ? "Загрузка..." : "Нажмите для загрузки"}</span>
                  </button>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Название *
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                  placeholder="Осенняя коллекция"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Подзаголовок
                </label>
                <input
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                  placeholder="Скидки до 50%"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Ссылка
                </label>
                <input
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                  placeholder="/catalog?sale=true"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Позиция
                  </label>
                  <select
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                  >
                    <option value="hero">Hero (главная)</option>
                    <option value="category">Категория</option>
                    <option value="promo">Промо</option>
                    <option value="sidebar">Сайдбар</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Порядок
                  </label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Активен</span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>
                Отмена
              </Button>
              <Button variant="default" onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? "Сохранение..." : editingBanner ? "Сохранить" : "Создать"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
