"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus, X, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut } from "@/lib/api";
import { useCategories, useBrands } from "@/hooks/use-products";

// ---- Cyrillic -> Latin transliteration map ----
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

// ---- Types ----
interface SizeOption {
  id: string;
  name: string;
  sort_order: number;
  size_type: string;
}

interface ColorOption {
  id: string;
  name: string;
  hex_code: string;
}

interface ApiVariant {
  id?: string;
  size_id: string;
  color_id: string;
  sku: string;
  barcode?: string | null;
  additional_price: number | string;
  is_active: boolean;
}

interface ApiImage {
  id?: string;
  url: string;
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
  material?: string | null;
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
  size_id: string;
  color_id: string;
  sku: string;
  barcode: string;
  additional_price: number;
  is_active: boolean;
}

interface ImageForm {
  _key: string;
  id?: string;
  url: string;
  alt_text: string;
  sort_order: number;
  is_primary: boolean;
}

const EMPTY_VARIANT = (): VariantForm => ({
  _key: Date.now().toString() + Math.random(),
  size_id: "",
  color_id: "",
  sku: "",
  barcode: "",
  additional_price: 0,
  is_active: true,
});

const EMPTY_IMAGE = (): ImageForm => ({
  _key: Date.now().toString() + Math.random(),
  url: "",
  alt_text: "",
  sort_order: 0,
  is_primary: false,
});

// ---- Shared Tailwind classes ----
const INPUT_CLS =
  "w-full px-4 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white";
const LABEL_CLS =
  "block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2";
const CARD_CLS =
  "bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-soft border border-neutral-200 dark:border-neutral-700";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const slug = params.slug as string;

  // ---- Fetch the product by slug ----
  const {
    data: product,
    isLoading: productLoading,
    isError: productError,
  } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => apiGet<ApiProduct>(`/products/${slug}`),
    enabled: !!slug,
  });

  // ---- Fetch reference data ----
  const { data: categoriesData } = useCategories();
  const { data: brandsData } = useBrands();
  const { data: sizesData } = useQuery({
    queryKey: ["sizes"],
    queryFn: () => apiGet<SizeOption[]>("/sizes"),
  });
  const { data: colorsData } = useQuery({
    queryKey: ["colors"],
    queryFn: () => apiGet<ColorOption[]>("/colors"),
  });

  const categories = categoriesData ?? [];
  const brands = brandsData ?? [];
  const sizes = sizesData ?? [];
  const colors = colorsData ?? [];

  // ---- Form state ----
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

  const [gender, setGender] = useState<"boys" | "girls" | "unisex">("unisex");
  const [ageMin, setAgeMin] = useState<number | "">("");
  const [ageMax, setAgeMax] = useState<number | "">("");
  const [material, setMaterial] = useState("");

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
  const [images, setImages] = useState<ImageForm[]>([]);

  const [errors, setErrors] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // ---- Product ID stored for PUT URL ----
  const [productId, setProductId] = useState("");

  // ---- Pre-fill form when product loads ----
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
      setGender((product.gender as "boys" | "girls" | "unisex") || "unisex");
      setAgeMin(product.age_min ?? "");
      setAgeMax(product.age_max ?? "");
      setMaterial(product.material || "");
      setPurchasePrice(
        product.purchase_price != null ? Number(product.purchase_price) : ""
      );
      setSellingPrice(Number(product.selling_price) || "");
      setDiscountPercent(product.discount_percent || 0);
      setDiscountPrice(
        product.discount_price != null ? Number(product.discount_price) : ""
      );
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
          size_id: v.size_id,
          color_id: v.color_id,
          sku: v.sku,
          barcode: v.barcode || "",
          additional_price: Number(v.additional_price) || 0,
          is_active: v.is_active,
        }))
      );

      setImages(
        (product.images || []).map((img) => ({
          _key: (img.id || Date.now().toString()) + Math.random(),
          id: img.id,
          url: img.url,
          alt_text: img.alt_text || "",
          sort_order: img.sort_order,
          is_primary: img.is_primary,
        }))
      );

      setInitialized(true);
    }
  }, [product, initialized]);

  // ---- Variant helpers ----
  const addVariant = () => setVariants((v) => [...v, EMPTY_VARIANT()]);
  const removeVariant = (key: string) =>
    setVariants((v) => v.filter((item) => item._key !== key));
  const updateVariant = (
    key: string,
    field: keyof VariantForm,
    value: string | number | boolean
  ) =>
    setVariants((prev) =>
      prev.map((v) => (v._key === key ? { ...v, [field]: value } : v))
    );

  // ---- Image helpers ----
  const addImage = () => setImages((imgs) => [...imgs, EMPTY_IMAGE()]);
  const removeImage = (key: string) =>
    setImages((imgs) => imgs.filter((item) => item._key !== key));
  const updateImage = (
    key: string,
    field: keyof ImageForm,
    value: string | number | boolean
  ) =>
    setImages((prev) =>
      prev.map((img) => (img._key === key ? { ...img, [field]: value } : img))
    );

  // ---- Validation ----
  const validate = useCallback((): string[] => {
    const errs: string[] = [];
    if (!name.trim()) errs.push("Название обязательно");
    if (!formSku.trim()) errs.push("Артикул (SKU) обязателен");
    if (!categoryId) errs.push("Выберите категорию");
    if (!brandId) errs.push("Выберите бренд");
    if (!sellingPrice || Number(sellingPrice) <= 0)
      errs.push("Укажите розничную цену");
    return errs;
  }, [name, formSku, categoryId, brandId, sellingPrice]);

  // ---- Mutation ----
  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPut<unknown>(`/products/${productId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", slug] });
      alert("Товар успешно обновлён!");
      router.push("/admin/products");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Ошибка при обновлении товара";
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
      material: material.trim() || undefined,
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
        .filter((v) => v.size_id && v.color_id && v.sku)
        .map((v) => ({
          size_id: v.size_id,
          color_id: v.color_id,
          sku: v.sku,
          barcode: v.barcode || undefined,
          additional_price: Number(v.additional_price) || 0,
          is_active: v.is_active,
        })),
      images: images
        .filter((img) => img.url.trim())
        .map((img, idx) => ({
          url: img.url.trim(),
          alt_text: img.alt_text.trim() || undefined,
          sort_order: img.sort_order || idx,
          is_primary: img.is_primary,
        })),
    };

    updateMutation.mutate(payload);
  };

  // ---- Loading / Error states ----
  if (productLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        <span className="ml-3 text-neutral-600 dark:text-neutral-400">
          Загрузка товара...
        </span>
      </div>
    );
  }

  if (productError || (!productLoading && !product)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-red-600 dark:text-red-400">
          Товар не найден или произошла ошибка загрузки.
        </p>
        <Link href="/admin/products">
          <Button variant="outline">Назад к списку товаров</Button>
        </Link>
      </div>
    );
  }

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
            Редактировать товар
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            {product?.name}
          </p>
        </div>
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
            Пожалуйста, исправьте ошибки:
          </p>
          <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-400 space-y-1">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className={CARD_CLS}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">
              Основная информация
            </h2>
            <div className="space-y-4">
              <div>
                <label className={LABEL_CLS}>Название *</label>
                <input
                  type="text"
                  className={INPUT_CLS}
                  placeholder="Платье летнее с принтом"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className={LABEL_CLS}>Название (UZ)</label>
                <input
                  type="text"
                  className={INPUT_CLS}
                  placeholder="Yozgi prinli ko'ylak"
                  value={nameUz}
                  onChange={(e) => setNameUz(e.target.value)}
                />
              </div>

              <div>
                <label className={LABEL_CLS}>Название (RU)</label>
                <input
                  type="text"
                  className={INPUT_CLS}
                  placeholder="Платье летнее с принтом"
                  value={nameRu}
                  onChange={(e) => setNameRu(e.target.value)}
                />
              </div>

              <div>
                <label className={LABEL_CLS}>Название (EN)</label>
                <input
                  type="text"
                  className={INPUT_CLS}
                  placeholder="Summer dress with print"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>Артикул (SKU) *</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    placeholder="DRS-001"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Штрихкод</label>
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
                  placeholder="plate-letnee-s-printom"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                />
              </div>

              <div>
                <label className={LABEL_CLS}>Описание</label>
                <textarea
                  rows={4}
                  className={`${INPUT_CLS} resize-none`}
                  placeholder="Описание товара..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className={LABEL_CLS}>Краткое описание</label>
                <textarea
                  rows={2}
                  className={`${INPUT_CLS} resize-none`}
                  placeholder="Краткое описание товара..."
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Category & Brand */}
          <div className={CARD_CLS}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">
              Категория и бренд
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Категория *</label>
                <select
                  className={INPUT_CLS}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Выберите категорию</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Бренд *</label>
                <select
                  className={INPUT_CLS}
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                >
                  <option value="">Выберите бренд</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Gender, Age, Material */}
          <div className={CARD_CLS}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">
              Характеристики
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={LABEL_CLS}>Пол</label>
                <select
                  className={INPUT_CLS}
                  value={gender}
                  onChange={(e) =>
                    setGender(e.target.value as "boys" | "girls" | "unisex")
                  }
                >
                  <option value="unisex">Унисекс</option>
                  <option value="boys">Мальчики</option>
                  <option value="girls">Девочки</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Возраст от (мес.)</label>
                <input
                  type="number"
                  className={INPUT_CLS}
                  placeholder="0"
                  min={0}
                  value={ageMin}
                  onChange={(e) =>
                    setAgeMin(e.target.value ? Number(e.target.value) : "")
                  }
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Возраст до (мес.)</label>
                <input
                  type="number"
                  className={INPUT_CLS}
                  placeholder="168"
                  min={0}
                  value={ageMax}
                  onChange={(e) =>
                    setAgeMax(e.target.value ? Number(e.target.value) : "")
                  }
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Материал</label>
                <input
                  type="text"
                  className={INPUT_CLS}
                  placeholder="100% хлопок"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className={CARD_CLS}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">
              Цены
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={LABEL_CLS}>Закупочная цена</label>
                <input
                  type="number"
                  className={INPUT_CLS}
                  placeholder="100000"
                  min={0}
                  value={purchasePrice}
                  onChange={(e) =>
                    setPurchasePrice(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Розничная цена *</label>
                <input
                  type="number"
                  className={INPUT_CLS}
                  placeholder="180000"
                  min={0}
                  value={sellingPrice}
                  onChange={(e) =>
                    setSellingPrice(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Скидка (%)</label>
                <input
                  type="number"
                  className={INPUT_CLS}
                  placeholder="0"
                  min={0}
                  max={100}
                  value={discountPercent}
                  onChange={(e) =>
                    setDiscountPercent(Number(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Цена со скидкой</label>
                <input
                  type="number"
                  className={INPUT_CLS}
                  placeholder="Авто"
                  min={0}
                  value={discountPrice}
                  onChange={(e) =>
                    setDiscountPrice(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                />
              </div>
            </div>
          </div>

          {/* Variants */}
          <div className={CARD_CLS}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Варианты товара
              </h2>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={addVariant}
              >
                Добавить вариант
              </Button>
            </div>

            {variants.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-6">
                Нет вариантов. Нажмите &quot;Добавить вариант&quot;, чтобы создать.
              </p>
            ) : (
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
                          value={variant.size_id}
                          onChange={(e) =>
                            updateVariant(
                              variant._key,
                              "size_id",
                              e.target.value
                            )
                          }
                        >
                          <option value="">Размер</option>
                          {sizes.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <select
                          className="px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white"
                          value={variant.color_id}
                          onChange={(e) =>
                            updateVariant(
                              variant._key,
                              "color_id",
                              e.target.value
                            )
                          }
                        >
                          <option value="">Цвет</option>
                          {colors.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="SKU варианта"
                          value={variant.sku}
                          onChange={(e) =>
                            updateVariant(variant._key, "sku", e.target.value)
                          }
                          className="px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white"
                        />
                        <input
                          type="text"
                          placeholder="Штрихкод"
                          value={variant.barcode}
                          onChange={(e) =>
                            updateVariant(
                              variant._key,
                              "barcode",
                              e.target.value
                            )
                          }
                          className="px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white"
                        />
                        <input
                          type="number"
                          placeholder="Доп. цена"
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
                        <label className="flex items-center gap-2 px-3 py-2">
                          <input
                            type="checkbox"
                            checked={variant.is_active}
                            onChange={(e) =>
                              updateVariant(
                                variant._key,
                                "is_active",
                                e.target.checked
                              )
                            }
                            className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-neutral-700 dark:text-neutral-300">
                            Активен
                          </span>
                        </label>
                      </div>
                      <button
                        onClick={() => removeVariant(variant._key)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Images */}
          <div className={CARD_CLS}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Изображения
              </h2>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={addImage}
              >
                Добавить изображение
              </Button>
            </div>

            {images.length === 0 ? (
              <div
                onClick={addImage}
                className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg p-12 text-center hover:border-primary-500 transition-colors cursor-pointer"
              >
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Нажмите, чтобы добавить URL изображения
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {images.map((img) => (
                  <div
                    key={img._key}
                    className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700"
                  >
                    {img.url && (
                      <img
                        src={img.url}
                        alt={img.alt_text || "Preview"}
                        className="w-10 h-10 object-cover rounded border border-neutral-200 dark:border-neutral-700"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    <input
                      type="text"
                      placeholder="URL изображения"
                      value={img.url}
                      onChange={(e) =>
                        updateImage(img._key, "url", e.target.value)
                      }
                      className="flex-1 px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Alt text"
                      value={img.alt_text}
                      onChange={(e) =>
                        updateImage(img._key, "alt_text", e.target.value)
                      }
                      className="w-40 px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white"
                    />
                    <label className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                      <input
                        type="radio"
                        name="primary_image"
                        checked={img.is_primary}
                        onChange={() =>
                          setImages((prev) =>
                            prev.map((im) => ({
                              ...im,
                              is_primary: im._key === img._key,
                            }))
                          )
                        }
                        className="w-3 h-3"
                      />
                      Главное
                    </label>
                    <button
                      onClick={() => removeImage(img._key)}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                  placeholder="Meta title..."
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Meta Description</label>
                <textarea
                  rows={3}
                  className={`${INPUT_CLS} resize-none`}
                  placeholder="Meta description..."
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className={CARD_CLS}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
              Публикация
            </h2>
            <div className="space-y-4">
              <div>
                <label className={LABEL_CLS}>Статус</label>
                <select
                  className={INPUT_CLS}
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value as "draft" | "active" | "inactive"
                    )
                  }
                >
                  <option value="draft">Черновик</option>
                  <option value="active">Активен</option>
                  <option value="inactive">Неактивен</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    Показывать на главной
                  </span>
                </label>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNew}
                    onChange={(e) => setIsNew(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    Новинка
                  </span>
                </label>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBestseller}
                    onChange={(e) => setIsBestseller(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    Хит продаж
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Info card */}
          <div className={CARD_CLS}>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
              Информация
            </h2>
            <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
              <p>
                ID:{" "}
                <span className="font-mono text-xs">{productId}</span>
              </p>
              {product?.created_at && (
                <p>
                  Создан:{" "}
                  {new Date(product.created_at).toLocaleDateString("ru-RU")}
                </p>
              )}
              {product?.updated_at && (
                <p>
                  Обновлён:{" "}
                  {new Date(product.updated_at).toLocaleDateString("ru-RU")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-72 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 p-4 shadow-elevated z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link href="/admin/products">
            <Button variant="ghost">Отмена</Button>
          </Link>
          <Button
            variant="default"
            leftIcon={<Save className="w-4 h-4" />}
            onClick={handleSubmit}
            isLoading={updateMutation.isPending}
          >
            Сохранить изменения
          </Button>
        </div>
      </div>
    </div>
  );
}
