"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus, X, Save, Loader2, Upload, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut, apiPost, apiDelete } from "@/lib/api";
import { useCategories, useBrands } from "@/hooks/use-products";

interface ColorOption {
  id: string;
  name: string;
  hex_code: string;
}

interface ApiVariant {
  id?: string;
  color_id: string;
  sku: string;
  barcode?: string | null;
  additional_price: number | string;
  is_active: boolean;
}

interface ApiImage {
  id?: string;
  file_path: string;
  alt_text?: string | null;
  sort_order: number;
  is_primary: boolean;
}

interface ApiProduct {
  id: string;
  name: string;
  name_uz?: string | null;
  name_ru?: string | null;
  name_en?: string | null;
  slug: string;
  sku: string;
  barcode?: string | null;
  description?: string | null;
  short_description?: string | null;
  brand_id: string;
  category_id: string;
  collection_id?: string | null;
  gender: string;
  age_min?: number | null;
  age_max?: number | null;
  max_weight_kg?: number | string | null;
  product_weight_kg?: number | string | null;
  dimensions?: string | null;
  wheel_type?: string | null;
  wheel_count?: number | null;
  max_speed_kmh?: number | null;
  battery_type?: string | null;
  has_remote_control?: boolean;
  has_lights?: boolean;
  has_music?: boolean;
  purchase_price?: number | string;
  selling_price: number | string;
  discount_percent: number;
  discount_price?: number | string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  status: string;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  variants: ApiVariant[];
  images: ApiImage[];
  created_at: string;
  updated_at?: string | null;
}

interface VariantForm {
  _key: string;
  id?: string;
  color_id: string;
  sku: string;
  barcode: string;
  additional_price: number;
  is_active: boolean;
}

const EMPTY_VARIANT = (): VariantForm => ({
  _key: Date.now().toString() + Math.random(),
  color_id: "",
  sku: "",
  barcode: "",
  additional_price: 0,
  is_active: true,
});

const INPUT_CLS =
  "w-full px-4 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white";
const LABEL_CLS =
  "block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2";
const CARD_CLS =
  "bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-soft border border-neutral-200 dark:border-neutral-700";

function ImageManager({ productId, initialImages }: { productId: string; initialImages: ApiImage[] }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ApiImage[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

  const uploadFile = async (file: File, isPrimary: boolean = false) => {
    if (!productId) return;
    const formData = new FormData();
    formData.append("file", file);
    const url = `/products/${productId}/images${isPrimary ? "?is_primary=true" : ""}`;
    const img = await apiPost<ApiImage>(url, formData, {
      headers: { "Content-Type": undefined },
    });
    return img;
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (!productId) return;
    setUploading(true);
    try {
      const fileArr = Array.from(files);
      for (const file of fileArr) {
        const isPrimary = images.length === 0 && fileArr.indexOf(file) === 0;
        const img = await uploadFile(file, isPrimary);
        if (img) setImages((prev) => [...prev, img]);
      }
      queryClient.invalidateQueries({ queryKey: ["product"] });
    } catch (err) {
      alert("Rasm yuklashda xatolik");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm("Rasmni o'chirmoqchimisiz?")) return;
    try {
      await apiDelete(`/products/${productId}/images/${imageId}`);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      queryClient.invalidateQueries({ queryKey: ["product"] });
    } catch {
      alert("O'chirishda xatolik");
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      await apiPost(`/products/${productId}/images/${imageId}/set-primary`);
      setImages((prev) =>
        prev.map((img) => ({ ...img, is_primary: img.id === imageId }))
      );
      queryClient.invalidateQueries({ queryKey: ["product"] });
    } catch {
      setImages((prev) =>
        prev.map((img) => ({ ...img, is_primary: img.id === imageId }))
      );
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  return (
    <div className={CARD_CLS}>
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Rasmlar</h2>

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-primary-500 bg-primary-50 dark:bg-primary-950/20"
            : "border-neutral-300 dark:border-neutral-600 hover:border-primary-400"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        {uploading ? (
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-500" />
        ) : (
          <>
            <Upload className="mx-auto h-8 w-8 text-neutral-400 mb-2" />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Fayllarni bu yerga tashlang yoki tanlash uchun bosing
            </p>
            <p className="text-xs text-neutral-400 mt-1">JPEG, PNG, WebP, AVIF</p>
          </>
        )}
      </div>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-4">
          {images.map((img) => (
            <div key={img.id} className="group relative aspect-square rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
              <Image src={img.file_path} alt={img.alt_text || "Product"} fill unoptimized className="object-cover" />
              {img.is_primary && (
                <span className="absolute top-1 left-1 bg-primary-500 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5" /> Asosiy
                </span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!img.is_primary && (
                  <button
                    onClick={() => handleSetPrimary(img.id!)}
                    className="p-1.5 bg-white rounded-full text-primary-600 hover:bg-primary-50"
                    title="Asosiy qilish"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(img.id!)}
                  className="p-1.5 bg-white rounded-full text-red-600 hover:bg-red-50"
                  title="O'chirish"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ColorCreator({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#000000");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !hex) return;
    setSaving(true);
    try {
      await apiPost("/colors", { name: name.trim(), hex_code: hex });
      setName("");
      setHex("#000000");
      setOpen(false);
      onCreated();
    } catch {
      alert("Rang yaratishda xatolik");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 text-xs text-primary-600 hover:underline"
      >
        + Yangi rang qo'shish
      </button>
    );
  }

  return (
    <div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Yangi rang</p>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Nomi (masalan, Pushti)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            className="h-9 w-12 rounded border border-neutral-200 dark:border-neutral-700 cursor-pointer"
          />
          <span className="text-xs font-mono text-neutral-500">{hex}</span>
        </div>
        <Button variant="default" size="sm" onClick={handleCreate} isLoading={saving}>
          Yaratish
        </Button>
        <button onClick={() => setOpen(false)} className="p-2 text-neutral-400 hover:text-neutral-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const slug = params.slug as string;

  const {
    data: product,
    isLoading: productLoading,
    isError: productError,
  } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => apiGet<ApiProduct>(`/products/${slug}`),
    enabled: !!slug,
  });

  const { data: categoriesData } = useCategories();
  const { data: brandsData } = useBrands();
  const { data: colorsData } = useQuery({
    queryKey: ["colors"],
    queryFn: () => apiGet<ColorOption[]>("/colors"),
  });

  const categories = categoriesData ?? [];
  const brands = brandsData ?? [];
  const colors = colorsData ?? [];

  const [name, setName] = useState("");
  const [nameUz, setNameUz] = useState("");
  const [nameRu, setNameRu] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formSku, setFormSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");

  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [collectionId, setCollectionId] = useState("");

  const [gender, setGender] = useState<"boys" | "girls" | "both">("both");
  const [ageMin, setAgeMin] = useState<number | "">("");
  const [ageMax, setAgeMax] = useState<number | "">("");

  // Vehicle fields
  const [maxWeightKg, setMaxWeightKg] = useState<number | "">("");
  const [productWeightKg, setProductWeightKg] = useState<number | "">("");
  const [dimensions, setDimensions] = useState("");
  const [wheelType, setWheelType] = useState("");
  const [wheelCount, setWheelCount] = useState<number | "">("");
  const [maxSpeedKmh, setMaxSpeedKmh] = useState<number | "">("");
  const [batteryType, setBatteryType] = useState("");
  const [hasRemoteControl, setHasRemoteControl] = useState(false);
  const [hasLights, setHasLights] = useState(false);
  const [hasMusic, setHasMusic] = useState(false);

  const [purchasePrice, setPurchasePrice] = useState<number | "">("");
  const [sellingPrice, setSellingPrice] = useState<number | "">("");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountPrice, setDiscountPrice] = useState<number | "">("");

  const [status, setStatus] = useState<"draft" | "active" | "inactive">("draft");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBestseller, setIsBestseller] = useState(false);
  const [isNew, setIsNew] = useState(false);

  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  const [variants, setVariants] = useState<VariantForm[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [productId, setProductId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product && !initialized) {
      setProductId(product.id);
      setName(product.name || "");
      setNameUz(product.name_uz || "");
      setNameRu(product.name_ru || "");
      setNameEn(product.name_en || "");
      setFormSlug(product.slug || "");
      setFormSku(product.sku || "");
      setBarcode(product.barcode || "");
      setDescription(product.description || "");
      setShortDescription(product.short_description || "");
      setBrandId(product.brand_id || "");
      setCategoryId(product.category_id || "");
      setCollectionId(product.collection_id || "");
      setGender((product.gender as "boys" | "girls" | "both") || "both");
      setAgeMin(product.age_min ?? "");
      setAgeMax(product.age_max ?? "");
      setMaxWeightKg(product.max_weight_kg != null ? Number(product.max_weight_kg) : "");
      setProductWeightKg(product.product_weight_kg != null ? Number(product.product_weight_kg) : "");
      setDimensions(product.dimensions || "");
      setWheelType(product.wheel_type || "");
      setWheelCount(product.wheel_count ?? "");
      setMaxSpeedKmh(product.max_speed_kmh ?? "");
      setBatteryType(product.battery_type || "");
      setHasRemoteControl(product.has_remote_control || false);
      setHasLights(product.has_lights || false);
      setHasMusic(product.has_music || false);
      setPurchasePrice(product.purchase_price != null ? Number(product.purchase_price) : "");
      setSellingPrice(Number(product.selling_price) || "");
      setDiscountPercent(product.discount_percent || 0);
      setDiscountPrice(product.discount_price != null ? Number(product.discount_price) : "");
      setStatus((product.status as "draft" | "active" | "inactive") || "draft");
      setIsFeatured(product.is_featured);
      setIsBestseller(product.is_bestseller);
      setIsNew(product.is_new);
      setSeoTitle(product.seo_title || "");
      setSeoDescription(product.seo_description || "");

      setVariants(
        (product.variants || []).map((v) => ({
          _key: (v.id || Date.now().toString()) + Math.random(),
          id: v.id,
          color_id: v.color_id,
          sku: v.sku,
          barcode: v.barcode || "",
          additional_price: Number(v.additional_price) || 0,
          is_active: v.is_active,
        }))
      );

      setInitialized(true);
    }
  }, [product, initialized]);

  const addVariant = () => setVariants((v) => [...v, EMPTY_VARIANT()]);
  const removeVariant = (key: string) =>
    setVariants((v) => v.filter((item) => item._key !== key));
  const updateVariant = (key: string, field: keyof VariantForm, value: string | number | boolean) =>
    setVariants((prev) =>
      prev.map((v) => (v._key === key ? { ...v, [field]: value } : v))
    );

  const validate = useCallback((): string[] => {
    const errs: string[] = [];
    if (!name.trim()) errs.push("Nomi majburiy");
    if (!formSku.trim()) errs.push("Artikul (SKU) majburiy");
    if (!categoryId) errs.push("Kategoriyani tanlang");
    if (!brandId) errs.push("Brendni tanlang");
    if (!sellingPrice || Number(sellingPrice) <= 0) errs.push("Chakana narxni kiriting");
    return errs;
  }, [name, formSku, categoryId, brandId, sellingPrice]);

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPut<unknown>(`/products/${productId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", slug] });
      alert("Mahsulot muvaffaqiyatli yangilandi!");
      router.push("/admin/products");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Mahsulotni yangilashda xatolik";
      alert(msg);
    },
  });

  const handleSubmit = () => {
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErrors([]);

    const payload: Record<string, unknown> = {
      name: name.trim(),
      name_uz: nameUz.trim() || undefined,
      name_ru: nameRu.trim() || undefined,
      name_en: nameEn.trim() || undefined,
      slug: formSlug.trim(),
      sku: formSku.trim(),
      barcode: barcode.trim() || undefined,
      description: description.trim() || undefined,
      short_description: shortDescription.trim() || undefined,
      brand_id: brandId,
      category_id: categoryId,
      collection_id: collectionId || undefined,
      gender,
      age_min: ageMin !== "" ? Number(ageMin) : undefined,
      age_max: ageMax !== "" ? Number(ageMax) : undefined,
      max_weight_kg: maxWeightKg !== "" ? Number(maxWeightKg) : undefined,
      product_weight_kg: productWeightKg !== "" ? Number(productWeightKg) : undefined,
      dimensions: dimensions.trim() || undefined,
      wheel_type: wheelType.trim() || undefined,
      wheel_count: wheelCount !== "" ? Number(wheelCount) : undefined,
      max_speed_kmh: maxSpeedKmh !== "" ? Number(maxSpeedKmh) : undefined,
      battery_type: batteryType.trim() || undefined,
      has_remote_control: hasRemoteControl,
      has_lights: hasLights,
      has_music: hasMusic,
      purchase_price: purchasePrice !== "" ? Number(purchasePrice) : undefined,
      selling_price: Number(sellingPrice),
      discount_percent: discountPercent,
      discount_price: discountPrice !== "" ? Number(discountPrice) : undefined,
      seo_title: seoTitle.trim() || undefined,
      seo_description: seoDescription.trim() || undefined,
      status,
      is_featured: isFeatured,
      is_bestseller: isBestseller,
      is_new: isNew,
      variants: variants
        .filter((v) => v.color_id && v.sku)
        .map((v) => ({
          color_id: v.color_id,
          sku: v.sku,
          barcode: v.barcode || undefined,
          additional_price: Number(v.additional_price) || 0,
          is_active: v.is_active,
        })),
    };

    updateMutation.mutate(payload);
  };

  if (productLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        <span className="ml-3 text-neutral-600 dark:text-neutral-400">Mahsulot yuklanmoqda...</span>
      </div>
    );
  }

  if (productError || (!productLoading && !product)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-red-600 dark:text-red-400">Mahsulot topilmadi yoki yuklashda xatolik.</p>
        <Link href="/admin/products">
          <Button variant="outline">Mahsulotlar ro'yxatiga qaytish</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link href="/admin/products">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Mahsulotni tahrirlash</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">{product?.name}</p>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Iltimos, xatolarni tuzating:</p>
          <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-400 space-y-1">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className={CARD_CLS}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Asosiy ma'lumotlar</h2>
            <div className="space-y-4">
              <div>
                <label className={LABEL_CLS}>Nomi *</label>
                <input type="text" className={INPUT_CLS} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className={LABEL_CLS}>Nomi (UZ)</label>
                <input type="text" className={INPUT_CLS} value={nameUz} onChange={(e) => setNameUz(e.target.value)} />
              </div>
              <div>
                <label className={LABEL_CLS}>Nomi (RU)</label>
                <input type="text" className={INPUT_CLS} value={nameRu} onChange={(e) => setNameRu(e.target.value)} />
              </div>
              <div>
                <label className={LABEL_CLS}>Nomi (EN)</label>
                <input type="text" className={INPUT_CLS} value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL_CLS}>Artikul (SKU) *</label>
                  <input type="text" className={INPUT_CLS} value={formSku} onChange={(e) => setFormSku(e.target.value)} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Shtrixkod</label>
                  <input type="text" className={INPUT_CLS} value={barcode} onChange={(e) => setBarcode(e.target.value)} />
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>Slug (URL)</label>
                <input type="text" className={INPUT_CLS} value={formSlug} onChange={(e) => setFormSlug(e.target.value)} />
              </div>
              <div>
                <label className={LABEL_CLS}>Tavsif</label>
                <textarea rows={4} className={`${INPUT_CLS} resize-none`} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div>
                <label className={LABEL_CLS}>Qisqa tavsif</label>
                <textarea rows={2} className={`${INPUT_CLS} resize-none`} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Category & Brand */}
          <div className={CARD_CLS}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Kategoriya va brend</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL_CLS}>Kategoriya *</label>
                <select className={INPUT_CLS} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Kategoriyani tanlang</option>
                  {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Brend *</label>
                <select className={INPUT_CLS} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                  <option value="">Brendni tanlang</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Gender & Age */}
          <div className={CARD_CLS}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Jinsi va yosh</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={LABEL_CLS}>Jinsi</label>
                <select className={INPUT_CLS} value={gender} onChange={(e) => setGender(e.target.value as "boys" | "girls" | "both")}>
                  <option value="both">Barchasi uchun</option>
                  <option value="boys">O'g'il bolalar uchun</option>
                  <option value="girls">Qiz bolalar uchun</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Yoshdan (oy)</label>
                <input type="number" className={INPUT_CLS} min={0} value={ageMin} onChange={(e) => setAgeMin(e.target.value ? Number(e.target.value) : "")} />
              </div>
              <div>
                <label className={LABEL_CLS}>Yoshgacha (oy)</label>
                <input type="number" className={INPUT_CLS} min={0} value={ageMax} onChange={(e) => setAgeMax(e.target.value ? Number(e.target.value) : "")} />
              </div>
            </div>
          </div>

          {/* Vehicle Specs */}
          <div className={CARD_CLS}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Transport xususiyatlari</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <label className={LABEL_CLS}>Maks. yuk (kg)</label>
                <input type="number" className={INPUT_CLS} min={0} step="0.1" value={maxWeightKg} onChange={(e) => setMaxWeightKg(e.target.value ? Number(e.target.value) : "")} />
              </div>
              <div>
                <label className={LABEL_CLS}>Mahsulot og'irligi (kg)</label>
                <input type="number" className={INPUT_CLS} min={0} step="0.1" value={productWeightKg} onChange={(e) => setProductWeightKg(e.target.value ? Number(e.target.value) : "")} />
              </div>
              <div>
                <label className={LABEL_CLS}>O'lchamlari</label>
                <input type="text" className={INPUT_CLS} placeholder="60x30x80 sm" value={dimensions} onChange={(e) => setDimensions(e.target.value)} />
              </div>
              <div>
                <label className={LABEL_CLS}>G'ildirak turi</label>
                <input type="text" className={INPUT_CLS} placeholder="PU, Rezina" value={wheelType} onChange={(e) => setWheelType(e.target.value)} />
              </div>
              <div>
                <label className={LABEL_CLS}>G'ildirak soni</label>
                <input type="number" className={INPUT_CLS} min={0} value={wheelCount} onChange={(e) => setWheelCount(e.target.value ? Number(e.target.value) : "")} />
              </div>
              <div>
                <label className={LABEL_CLS}>Maks. tezlik (km/soat)</label>
                <input type="number" className={INPUT_CLS} min={0} value={maxSpeedKmh} onChange={(e) => setMaxSpeedKmh(e.target.value ? Number(e.target.value) : "")} />
              </div>
              <div className="md:col-span-3">
                <label className={LABEL_CLS}>Akkumulyator turi</label>
                <input type="text" className={INPUT_CLS} placeholder="6V 4.5Ah" value={batteryType} onChange={(e) => setBatteryType(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={hasRemoteControl} onChange={(e) => setHasRemoteControl(e.target.checked)} className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Masofadan boshqarish pulti</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={hasLights} onChange={(e) => setHasLights(e.target.checked)} className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Yoritish</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={hasMusic} onChange={(e) => setHasMusic(e.target.checked)} className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Musiqa/tovushlar</span>
              </label>
            </div>
          </div>

          {/* Pricing */}
          <div className={CARD_CLS}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Narxlar</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={LABEL_CLS}>Sotib olish narxi</label>
                <input type="number" className={INPUT_CLS} min={0} value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value ? Number(e.target.value) : "")} />
              </div>
              <div>
                <label className={LABEL_CLS}>Chakana narx *</label>
                <input type="number" className={INPUT_CLS} min={0} value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value ? Number(e.target.value) : "")} />
              </div>
              <div>
                <label className={LABEL_CLS}>Chegirma (%)</label>
                <input type="number" className={INPUT_CLS} min={0} max={100} value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)} />
              </div>
              <div>
                <label className={LABEL_CLS}>Chegirmali narx</label>
                <input type="number" className={INPUT_CLS} min={0} value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value ? Number(e.target.value) : "")} />
              </div>
            </div>
          </div>

          {/* Variants */}
          <div className={CARD_CLS}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Variantlar (ranglar)</h2>
              <Button variant="outline" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={addVariant}>
                Variant qo'shish
              </Button>
            </div>
            {variants.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-6">
                Variantlar yo'q. Yaratish uchun &quot;Variant qo'shish&quot; tugmasini bosing.
              </p>
            ) : (
              <div className="space-y-4">
                {variants.map((variant) => (
                  <div key={variant._key} className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-start gap-4">
                      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                        <select
                          className="px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white"
                          value={variant.color_id}
                          onChange={(e) => updateVariant(variant._key, "color_id", e.target.value)}
                        >
                          <option value="">Rang</option>
                          {colors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <input
                          type="text"
                          placeholder="Variant SKU"
                          value={variant.sku}
                          onChange={(e) => updateVariant(variant._key, "sku", e.target.value)}
                          className="px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white"
                        />
                        <input
                          type="number"
                          placeholder="Qo'sh. narx"
                          value={variant.additional_price || ""}
                          onChange={(e) => updateVariant(variant._key, "additional_price", Number(e.target.value) || 0)}
                          className="px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white"
                        />
                      </div>
                      <button onClick={() => removeVariant(variant._key)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <ColorCreator onCreated={() => queryClient.invalidateQueries({ queryKey: ["colors"] })} />
          </div>

          {/* Images — upload, delete, set primary */}
          <ImageManager productId={productId} initialImages={product?.images ?? []} />

          {/* SEO */}
          <div className={CARD_CLS}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">SEO</h2>
            <div className="space-y-4">
              <div>
                <label className={LABEL_CLS}>Meta Title</label>
                <input type="text" className={INPUT_CLS} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
              </div>
              <div>
                <label className={LABEL_CLS}>Meta Description</label>
                <textarea rows={3} className={`${INPUT_CLS} resize-none`} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className={CARD_CLS}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Nashr qilish</h2>
            <div className="space-y-4">
              <div>
                <label className={LABEL_CLS}>Holat</label>
                <select className={INPUT_CLS} value={status} onChange={(e) => setStatus(e.target.value as "draft" | "active" | "inactive")}>
                  <option value="draft">Qoralama</option>
                  <option value="active">Faol</option>
                  <option value="inactive">Nofaol</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Bosh sahifada ko'rsatish</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Yangilik</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isBestseller} onChange={(e) => setIsBestseller(e.target.checked)} className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Eng ko'p sotilgan</span>
              </label>
            </div>
          </div>

          <div className={CARD_CLS}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Ma'lumot</h2>
            <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
              <p>ID: <span className="font-mono text-xs">{productId}</span></p>
              {product?.created_at && <p>Yaratilgan: {new Date(product.created_at).toLocaleDateString("uz-UZ")}</p>}
              {product?.updated_at && <p>Yangilangan: {new Date(product.updated_at).toLocaleDateString("uz-UZ")}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 lg:left-72 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-elevated z-30 sm:p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <Link href="/admin/products" className="hidden sm:block">
            <Button variant="ghost">Bekor qilish</Button>
          </Link>
          <Button variant="default" className="w-full sm:w-auto" leftIcon={<Save className="w-4 h-4" />} onClick={handleSubmit} isLoading={updateMutation.isPending}>
            O'zgarishlarni saqlash
          </Button>
        </div>
      </div>
    </div>
  );
}
