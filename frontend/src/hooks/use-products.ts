import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Product, ProductVariant, Category, Brand, Banner } from "@/types";

interface ApiVariant {
  id: string;
  product_id: string;
  color_id: string;
  sku: string;
  barcode?: string | null;
  additional_price: number | string;
  stock?: number;
  is_active: boolean;
  color?: {
    id: string;
    name: string;
    hex_code: string;
    is_active: boolean;
    name_uz?: string | null;
    name_ru?: string | null;
    name_en?: string | null;
  };
}

interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description?: string | null;
  short_description?: string | null;
  selling_price: number | string;
  discount_price?: number | string | null;
  discount_percent: number;
  gender: string;
  brand_id: string;
  category_id: string;
  collection_id?: string | null;
  status: string;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  views?: number;
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
  brand?: { id: string; name: string; slug: string; is_active: boolean } | null;
  category?: {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    sort_order: number;
  } | null;
  collection?: { id: string; name: string; slug: string } | null;
  variants: ApiVariant[];
  images: {
    id: string;
    product_id: string;
    file_path: string;
    alt_text?: string | null;
    sort_order: number;
    is_primary: boolean;
  }[];
  created_at: string;
  updated_at?: string | null;
}

interface ApiPaginatedProducts {
  items: ApiProduct[];
  total: number;
  page: number;
  pages: number;
}

function mapVariant(v: ApiVariant, productPrice: number): ProductVariant {
  const additionalPrice = Number(v.additional_price) || 0;
  return {
    id: v.id,
    product_id: v.product_id,
    color_id: v.color_id,
    sku: v.sku,
    is_active: v.is_active,
    stock: v.stock || 10,
    additional_price: additionalPrice,
    color: v.color
      ? {
          id: v.color.id,
          name: v.color.name,
          slug: v.color.name.toLowerCase().replace(/\s+/g, "-"),
          hex_code: v.color.hex_code,
        }
      : { id: v.color_id, name: "", slug: "", hex_code: "#000000" },
  };
}

export function mapApiProduct(p: ApiProduct): Product {
  const sellingPrice = Number(p.selling_price) || 0;
  const discountPrice = p.discount_price != null ? Number(p.discount_price) : null;
  const hasDiscount =
    discountPrice != null &&
    discountPrice > 0 &&
    discountPrice < sellingPrice;

  const finalPrice = hasDiscount ? discountPrice! : sellingPrice;

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description || "",
    short_description: p.short_description || undefined,
    sku: p.sku,
    brand_id: p.brand_id,
    category_id: p.category_id,
    collection_id: p.collection_id || undefined,
    brand: p.brand || undefined,
    category: p.category
      ? { ...p.category, sort_order: p.category.sort_order }
      : undefined,
    collection: p.collection
      ? { ...p.collection, is_active: true }
      : undefined,
    price: finalPrice,
    compare_at_price: hasDiscount ? sellingPrice : undefined,
    currency: "UZS",
    images: (p.images || []).map((img) => ({
      id: img.id,
      product_id: img.product_id,
      file_path: img.file_path,
      alt_text: img.alt_text || undefined,
      sort_order: img.sort_order,
      is_primary: img.is_primary,
    })),
    variants: (p.variants || []).map((v) => mapVariant(v, finalPrice)),
    tags: [],
    is_active: p.status === "active",
    is_featured: p.is_featured,
    is_new: p.is_new,
    is_bestseller: p.is_bestseller,
    views: p.views ?? 0,
    avg_rating: 0,
    review_count: 0,
    gender: p.gender as Product["gender"],
    age_min: p.age_min || undefined,
    age_max: p.age_max || undefined,
    max_weight_kg: p.max_weight_kg != null ? Number(p.max_weight_kg) : undefined,
    product_weight_kg: p.product_weight_kg != null ? Number(p.product_weight_kg) : undefined,
    dimensions: p.dimensions || undefined,
    wheel_type: p.wheel_type || undefined,
    wheel_count: p.wheel_count || undefined,
    max_speed_kmh: p.max_speed_kmh || undefined,
    battery_type: p.battery_type || undefined,
    has_remote_control: p.has_remote_control || false,
    has_lights: p.has_lights || false,
    has_music: p.has_music || false,
    created_at: p.created_at,
    updated_at: p.updated_at || p.created_at,
  };
}

export interface UseProductsParams {
  page?: number;
  page_size?: number;
  category_id?: string;
  brand_id?: string;
  gender?: string;
  is_featured?: boolean;
  is_new?: boolean;
  is_bestseller?: boolean;
  min_price?: number;
  max_price?: number;
  search?: string;
  sort_by?: string;
  is_on_sale?: boolean;
}

export function useProducts(params: UseProductsParams = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  const qs = searchParams.toString();
  const url = `/products${qs ? `?${qs}` : ""}`;

  return useQuery({
    queryKey: ["products", params],
    queryFn: async () => {
      const data = await apiGet<ApiPaginatedProducts>(url);
      return {
        items: data.items.map(mapApiProduct),
        total: data.total,
        page: data.page,
        pages: data.pages,
      };
    },
  });
}

export function useFeaturedProducts() {
  return useProducts({ is_featured: true, page_size: 8 });
}

export function useNewProducts() {
  return useProducts({ is_new: true, page_size: 8 });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const data = await apiGet<ApiProduct>(`/products/${slug}`);
      return mapApiProduct(data);
    },
    enabled: !!slug,
  });
}

export function useMostViewedProducts(limit: number = 10) {
  return useQuery({
    queryKey: ["products", "most-viewed", limit],
    queryFn: async () => {
      const data = await apiGet<ApiProduct[]>(`/products/most-viewed?limit=${limit}`);
      return data.map(mapApiProduct);
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => apiGet<Category[]>("/categories"),
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: () => apiGet<Brand[]>("/brands"),
  });
}

export function useBanners() {
  return useQuery({
    queryKey: ["banners"],
    queryFn: () => apiGet<Banner[]>("/banners"),
  });
}

export function useInfiniteProducts(params: Omit<UseProductsParams, "page"> = {}) {
  return useInfiniteQuery({
    queryKey: ["products-infinite", params],
    queryFn: async ({ pageParam = 1 }) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.set(key, String(value));
        }
      });
      searchParams.set("page", String(pageParam));
      if (!searchParams.has("page_size")) {
        searchParams.set("page_size", "20");
      }
      const qs = searchParams.toString();
      const data = await apiGet<ApiPaginatedProducts>(`/products?${qs}`);
      return {
        items: data.items.map(mapApiProduct),
        total: data.total,
        page: data.page,
        pages: data.pages,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
  });
}
