"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { useCategories, useBrands } from "@/hooks/use-products";

function ColorCreator({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [colorName, setColorName] = useState("");
  const [hex, setHex] = useState("#000000");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!colorName.trim() || !hex) return;
    setSaving(true);
    try {
      await apiPost("/colors", { name: colorName.trim(), hex_code: hex });
      setColorName("");
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
      <button onClick={() => setOpen(true)} className="mt-3 text-xs text-primary-600 hover:underline">
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
            value={colorName}
            onChange={(e) => setColorName(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="h-9 w-12 rounded border border-neutral-200 dark:border-neutral-700 cursor-pointer" />
          <span className="text-xs font-mono text-neutral-500">{hex}</span>
        </div>
        <Button variant="default" size="sm" onClick={handleCreate} isLoading={saving}>Yaratish</Button>
        <button onClick={() => setOpen(false)} className="p-2 text-neutral-400 hover:text-neutral-600"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

const CYR_TO_LAT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

function transliterate(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => CYR_TO_LAT[ch] ?? ch)
    .join("");
}

function generateSlug(name: string): string {
  return transliterate(name)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

interface ColorOption {
  id: string;
  name: string;
  hex_code: string;
}

interface VariantForm {
  _key: string;
  color_id: string;
  sku: string;
  barcode: string;
  additional_price: number;
  initial_stock: number;
  is_active: boolean;
}

const EMPTY_VARIANT = (): VariantForm => ({
  _key: Date.now().toString() + Math.random(),
  color_id: "",
  sku: "",
  barcode: "",
  additional_price: 0,
  initial_stock: 0,
  is_active: true,
});

const INPUT_CLS =
  "w-full px-4 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white";
const LABEL_CLS =
  "block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2";
const CARD_CLS =
  "bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-soft border border-neutral-200 dark:border-neutral-700";

export default function NewProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

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
  const [slug, setSlug] = useState("");
  const [sku, setSku] = useState("");
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

  const [variants, setVariants] = useState<VariantForm[]>([EMPTY_VARIANT()]);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (name) setSlug(generateSlug(name));
  }, [name]);

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
    if (!sku.trim()) errs.push("Artikul (SKU) majburiy");
    if (!categoryId) errs.push("Kategoriyani tanlang");
    if (!brandId) errs.push("Brendni tanlang");
    if (!purchasePrice || purchasePrice <= 0) errs.push("Sotib olish narxini kiriting");
    if (!sellingPrice || sellingPrice <= 0) errs.push("Chakana narxni kiriting");
    return errs;
  }, [name, sku, categoryId, brandId, purchasePrice, sellingPrice]);

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPost<{ id: string }>("/products", payload),
    onSuccess: () => {
      alert("Mahsulot muvaffaqiyatli yaratildi!");
      router.push("/admin/products");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Mahsulot yaratishda xatolik";
      alert(msg);
    },
  });

  const handleSubmit = (submitStatus?: "draft" | "active") => {
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
      slug: slug.trim(),
      sku: sku.trim(),
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
      purchase_price: Number(purchasePrice),
      selling_price: Number(sellingPrice),
      discount_percent: discountPercent,
      discount_price: discountPrice !== "" ? Number(discountPrice) : undefined,
      seo_title: seoTitle.trim() || undefined,
      seo_description: seoDescription.trim() || undefined,
      status: submitStatus ?? status,
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
          initial_stock: Math.max(0, Math.floor(Number(v.initial_stock) || 0)),
          is_active: v.is_active,
        })),
      // Used when no colour variant is filled in (a default variant is created)
      initial_stock: Math.max(0, Math.floor(Number(variants[0]?.initial_stock) || 0)),
    };

    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
            Yangi mahsulot
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Katalogga yangi mahsulot qo'shish
          </p>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
            Iltimos, xatolarni tuzating:
          </p>
          <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-400 space-y-1">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className={CARD_CLS}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">
              Asosiy ma'lumotlar
            </h2>
            <div className="space-y-4">
              <div>
                <label className={LABEL_CLS}>Nomi *</label>
                <input
                  type="text"
                  className={INPUT_CLS}
                  placeholder="Uch g'ildirakli samokat"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className={LABEL_CLS}>Nomi (UZ)</label>
                <input
                  type="text"
                  className={INPUT_CLS}
                  placeholder="Uch g'ildirakli samokat"
                  value={nameUz}
                  onChange={(e) => setNameUz(e.target.value)}
                />
              </div>

              <div>
                <label className={LABEL_CLS}>Nomi (RU)</label>
                <input
                  type="text"
                  className={INPUT_CLS}
                  placeholder="Samokat trehkolyosnyy"
                  value={nameRu}
                  onChange={(e) => setNameRu(e.target.value)}
                />
              </div>

              <div>
                <label className={LABEL_CLS}>Nomi (EN)</label>
                <input
                  type="text"
                  className={INPUT_CLS}
                  placeholder="Three-wheel scooter"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>Artikul (SKU) *</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    placeholder="VK-SCT-001"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Shtrixkod</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    placeholder="1234567890123"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className={LABEL_CLS}>Slug (URL)</label>
                <input
                  type="text"
                  className={INPUT_CLS}
                  placeholder="uch-gildirakli-samokat"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Nomdan avtomatik yaratiladi
                </p>
              </div>

              <div>
                <label className={LABEL_CLS}>Tavsif</label>
                <textarea
                  rows={4}
                  className={`${INPUT_CLS} resize-none`}
                  placeholder="Bolalar uchun uch g'ildirakli samokat..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className={LABEL_CLS}>Qisqa tavsif</label>
                <textarea
                  rows={2}
                  className={`${INPUT_CLS} resize-none`}
                  placeholder="Mahsulotning qisqa tavsifi..."
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Category & Brand */}
          <div className={CARD_CLS}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">
              Kategoriya va brend
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Kategoriya *</label>
                <select
                  className={INPUT_CLS}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Kategoriyani tanlang</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Brend *</label>
                <select
                  className={INPUT_CLS}
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                >
                  <option value="">Brendni tanlang</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Gender & Age */}
          <div className={CARD_CLS}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">
              Jinsi va yosh
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={LABEL_CLS}>Jinsi</label>
                <select
                  className={INPUT_CLS}
                  value={gender}
                  onChange={(e) =>
                    setGender(e.target.value as "boys" | "girls" | "both")
                  }
                >
                  <option value="both">Barchasi uchun</option>
                  <option value="boys">O'g'il bolalar uchun</option>
                  <option value="girls">Qiz bolalar uchun</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Yoshdan (oy)</label>
                <input
                  type="number"
                  className={INPUT_CLS}
                  placeholder="24"
                  min={0}
                  value={ageMin}
                  onChange={(e) =>
                    setAgeMin(e.target.value ? Number(e.target.value) : "")
                  }
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Yoshgacha (oy)</label>
                <input
                  type="number"
                  className={INPUT_CLS}
                  placeholder="96"
                  min={0}
                  value={ageMax}
                  onChange={(e) =>
                    setAgeMax(e.target.value ? Number(e.target.value) : "")
                  }
                />
              </div>
            </div>
          </div>

          {/* Vehicle Specs */}
          <div className={CARD_CLS}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">
              Transport xususiyatlari
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className={LABEL_CLS}>Maks. yuk (kg)</label>
                <input
                  type="number"
                  className={INPUT_CLS}
                  placeholder="50"
                  min={0}
                  step="0.1"
                  value={maxWeightKg}
                  onChange={(e) => setMaxWeightKg(e.target.value ? Number(e.target.value) : "")}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Mahsulot og'irligi (kg)</label>
                <input
                  type="number"
                  className={INPUT_CLS}
                  placeholder="3.5"
                  min={0}
                  step="0.1"
                  value={productWeightKg}
                  onChange={(e) => setProductWeightKg(e.target.value ? Number(e.target.value) : "")}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>O'lchamlari</label>
                <input
                  type="text"
                  className={INPUT_CLS}
                  placeholder="60x30x80 sm"
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>G'ildirak turi</label>
                <input
                  type="text"
                  className={INPUT_CLS}
                  placeholder="PU, Rezina, EVA"
                  value={wheelType}
                  onChange={(e) => setWheelType(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>G'ildirak soni</label>
                <input
                  type="number"
                  className={INPUT_CLS}
                  placeholder="3"
                  min={0}
                  value={wheelCount}
                  onChange={(e) => setWheelCount(e.target.value ? Number(e.target.value) : "")}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Maks. tezlik (km/s)</label>
                <input
                  type="number"
                  className={INPUT_CLS}
                  placeholder="5"
                  min={0}
                  value={maxSpeedKmh}
                  onChange={(e) => setMaxSpeedKmh(e.target.value ? Number(e.target.value) : "")}
                />
              </div>
              <div className="md:col-span-3">
                <label className={LABEL_CLS}>Akkumulyator turi</label>
                <input
                  type="text"
                  className={INPUT_CLS}
                  placeholder="6V 4.5Ah, 12V 7Ah va h.k."
                  value={batteryType}
                  onChange={(e) => setBatteryType(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasRemoteControl}
                  onChange={(e) => setHasRemoteControl(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  Masofadan boshqarish pulti
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasLights}
                  onChange={(e) => setHasLights(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  Yoritish
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasMusic}
                  onChange={(e) => setHasMusic(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  Musiqa/tovushlar
                </span>
              </label>
            </div>
          </div>

          {/* Pricing */}
          <div className={CARD_CLS}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">
              Narxlar
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={LABEL_CLS}>Sotib olish narxi *</label>
                <input
                  type="number"
                  className={INPUT_CLS}
                  placeholder="500000"
                  min={0}
                  value={purchasePrice}
                  onChange={(e) =>
                    setPurchasePrice(e.target.value ? Number(e.target.value) : "")
                  }
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Chakana narx *</label>
                <input
                  type="number"
                  className={INPUT_CLS}
                  placeholder="900000"
                  min={0}
                  value={sellingPrice}
                  onChange={(e) =>
                    setSellingPrice(e.target.value ? Number(e.target.value) : "")
                  }
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Chegirma (%)</label>
                <input
                  type="number"
                  className={INPUT_CLS}
                  placeholder="0"
                  min={0}
                  max={100}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Chegirmali narx</label>
                <input
                  type="number"
                  className={INPUT_CLS}
                  placeholder="Avto"
                  min={0}
                  value={discountPrice}
                  onChange={(e) =>
                    setDiscountPrice(e.target.value ? Number(e.target.value) : "")
                  }
                />
              </div>
            </div>
          </div>

          {/* Variants */}
          <div className={CARD_CLS}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Variantlar (ranglar)
              </h2>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={addVariant}
              >
                Variant qo'shish
              </Button>
            </div>

            <div className="space-y-4">
              {variants.map((variant) => (
                <div
                  key={variant._key}
                  className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3">
                      <select
                        className="px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white"
                        value={variant.color_id}
                        onChange={(e) =>
                          updateVariant(variant._key, "color_id", e.target.value)
                        }
                      >
                        <option value="">Rang</option>
                        {colors.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Variant SKU"
                        value={variant.sku}
                        onChange={(e) =>
                          updateVariant(variant._key, "sku", e.target.value)
                        }
                        className="px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white"
                      />
                      <input
                        type="number"
                        placeholder="Qo'sh. narx"
                        value={variant.additional_price || ""}
                        onChange={(e) =>
                          updateVariant(
                            variant._key,
                            "additional_price",
                            Number(e.target.value) || 0
                          )
                        }
                        className="px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white"
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="Omborda (dona)"
                        title="Boshlang'ich qoldiq — ombor tarixiga yoziladi"
                        value={variant.initial_stock || ""}
                        onChange={(e) =>
                          updateVariant(
                            variant._key,
                            "initial_stock",
                            Math.max(0, Number(e.target.value) || 0)
                          )
                        }
                        className="px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white"
                      />
                    </div>
                    {variants.length > 1 && (
                      <button
                        onClick={() => removeVariant(variant._key)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <ColorCreator onCreated={() => queryClient.invalidateQueries({ queryKey: ["colors"] })} />
            <p className="text-xs text-neutral-500 mt-3">
              Rasmlarni mahsulot yaratilgandan keyin tahrirlash sahifasida yuklash mumkin.
            </p>
          </div>

          {/* SEO */}
          <div className={CARD_CLS}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">
              SEO
            </h2>
            <div className="space-y-4">
              <div>
                <label className={LABEL_CLS}>Meta Title</label>
                <input
                  type="text"
                  className={INPUT_CLS}
                  placeholder="Uch g'ildirakli samokat | Velmora Kids"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Meta Description</label>
                <textarea
                  rows={3}
                  className={`${INPUT_CLS} resize-none`}
                  placeholder="Bolalar uchun yorug' g'ildirakli samokat..."
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className={CARD_CLS}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
              Nashr qilish
            </h2>
            <div className="space-y-4">
              <div>
                <label className={LABEL_CLS}>Holat</label>
                <select
                  className={INPUT_CLS}
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "draft" | "active" | "inactive")
                  }
                >
                  <option value="draft">Qoralama</option>
                  <option value="active">Faol</option>
                  <option value="inactive">Nofaol</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  Bosh sahifada ko'rsatish
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNew}
                  onChange={(e) => setIsNew(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  Yangilik
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBestseller}
                  onChange={(e) => setIsBestseller(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  Eng ko'p sotilgan
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-72 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 p-4 shadow-elevated z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link href="/admin/products">
            <Button variant="ghost">Bekor qilish</Button>
          </Link>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => handleSubmit("draft")}
              disabled={createMutation.isPending}
            >
              Qoralamani saqlash
            </Button>
            <Button
              variant="default"
              onClick={() => handleSubmit("active")}
              isLoading={createMutation.isPending}
            >
              Mahsulotni nashr qilish
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
