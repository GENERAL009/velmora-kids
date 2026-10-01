"use client";

export const dynamic = "force-dynamic";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/product/product-grid";
import { useProducts, useCategories, useBrands } from "@/hooks/use-products";
import { useTranslation } from "@/hooks/use-translation";
import { useLanguageStore } from "@/store/language";

const GENDER_MAP: Record<string, { gender: "girls" | "boys" }> = {
  girls: { gender: "girls" },
  boys: { gender: "boys" },
};

export default function CatalogSlugPage() {
  const t = useTranslation();
  const locale = useLanguageStore((s) => s.locale);
  const localizedName = (c: { name: string; name_uz?: string; name_ru?: string }) =>
    (locale === "uz" ? c.name_uz : c.name_ru) || c.name;

  const SORT_OPTIONS = [
    { value: "newest", label: t.catalogUi.sort.newest },
    { value: "price_asc", label: t.catalogUi.sort.priceAsc },
    { value: "price_desc", label: t.catalogUi.sort.priceDesc },
    { value: "name_asc", label: t.catalogUi.sort.nameAsc },
  ];

  const params = useParams();
  const slug = params.slug as string;

  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("newest");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [brandFilter, setBrandFilter] = useState<string>("");

  const genderInfo = GENDER_MAP[slug];
  const isGenderPage = !!genderInfo;

  const { data: categoriesData } = useCategories();
  const { data: brandsData } = useBrands();
  const categories = categoriesData ?? [];
  const brands = brandsData ?? [];

  const matchedCategory = !isGenderPage
    ? categories.find((c) => c.slug === slug)
    : null;

  const { data: productsData, isLoading } = useProducts({
    page: currentPage,
    page_size: 20,
    gender: isGenderPage ? genderInfo.gender : undefined,
    category_id: matchedCategory?.id || categoryFilter || undefined,
    brand_id: brandFilter || undefined,
    sort_by: sortBy,
  });

  const products = productsData?.items ?? [];
  const totalProducts = productsData?.total ?? 0;
  const totalPages = productsData?.pages ?? 1;

  const pageTitle = isGenderPage
    ? t.catalogUi.gender[genderInfo.gender]
    : (matchedCategory && localizedName(matchedCategory)) || slug;

  return (
    <div className="bg-cream min-h-screen">
      {/* Breadcrumb */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-neutral-600">
            <Link href="/" className="transition-colors hover:text-primary-600">
              {t.catalogUi.home}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/catalog" className="transition-colors hover:text-primary-600">
              {t.catalog.title}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-charcoal">{pageTitle}</span>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-charcoal lg:text-4xl">
            {pageTitle}
          </h1>
          <p className="mt-2 text-neutral-600">
            {isLoading ? t.common.loading : `${totalProducts} ${t.cart.item_many}`}
          </p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Sidebar filters */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm space-y-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-charcoal">
                <SlidersHorizontal className="h-4 w-4" />
                {t.catalog.filters}
              </div>

              {isGenderPage && categories.length > 0 && (
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-neutral-500">
                    {t.catalogUi.category}
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  >
                    <option value="">{t.catalogUi.allCategories}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{localizedName(c)}</option>
                    ))}
                  </select>
                </div>
              )}

              {brands.length > 0 && (
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-neutral-500">
                    {t.catalogUi.brand}
                  </label>
                  <select
                    value={brandFilter}
                    onChange={(e) => { setBrandFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  >
                    <option value="">{t.catalogUi.allBrands}</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-neutral-500">
                  {t.catalog.sortBy}
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </aside>

          {/* Products */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-lg border border-neutral-200 bg-white">
                    <div className="aspect-[3/4] bg-neutral-200 rounded-t-lg" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 w-20 bg-neutral-200 rounded" />
                      <div className="h-5 w-full bg-neutral-200 rounded" />
                      <div className="h-6 w-24 bg-neutral-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                <ProductGrid products={products} />

                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      {t.common.back}
                    </Button>
                    <span className="text-sm text-neutral-600">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      {t.catalogUi.pagination.forward}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
                <p className="mb-2 font-display text-xl text-charcoal">{t.catalog.noResults}</p>
                <p className="mb-6 text-neutral-600">{t.catalogUi.noResultsFilterDesc}</p>
                <Link href="/catalog">
                  <Button>{t.catalogUi.wholeCatalog}</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
