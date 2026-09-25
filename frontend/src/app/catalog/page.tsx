"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { SlidersHorizontal, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/product/product-grid";
import { FiltersSidebar } from "@/components/catalog/filters-sidebar";
import { SortSelect } from "@/components/catalog/sort-select";
import { ActiveFilters } from "@/components/catalog/active-filters";
import { Pagination } from "@/components/catalog/pagination";
import { useProducts, useCategories, useBrands } from "@/hooks/use-products";
import { useTranslation } from "@/hooks/use-translation";

function CatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslation();

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  const [filters, setFilters] = useState<{
    category_ids: string[];
    brand_ids: string[];
    gender: string[];
    min_price?: number;
    max_price?: number;
    is_on_sale: boolean;
  }>({
    category_ids: searchParams.get("category")?.split(",").filter(Boolean) || [],
    brand_ids: searchParams.get("brand")?.split(",").filter(Boolean) || [],
    gender: searchParams.get("gender")?.split(",").filter(Boolean) || [],
    min_price: searchParams.get("min_price") ? parseFloat(searchParams.get("min_price")!) : undefined,
    max_price: searchParams.get("max_price") ? parseFloat(searchParams.get("max_price")!) : undefined,
    is_on_sale: searchParams.get("sale") === "true",
  });

  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page") || "1")
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const pageSize = 12;

  const { data: categoriesData } = useCategories();
  const { data: brandsData } = useBrands();

  const categories = categoriesData || [];
  const brands = brandsData || [];

  const { data: productsData, isLoading } = useProducts({
    page: currentPage,
    page_size: pageSize,
    category_id: filters.category_ids[0] || undefined,
    brand_id: filters.brand_ids[0] || undefined,
    gender: filters.gender[0] || undefined,
    min_price: filters.min_price,
    max_price: filters.max_price,
    is_on_sale: filters.is_on_sale || undefined,
    sort_by: sortBy,
    search: debouncedSearch || undefined,
  });

  const products = productsData?.items || [];
  const totalProducts = productsData?.total || 0;
  const totalPages = productsData?.pages || 1;

  const updateURL = React.useCallback(() => {
    const params = new URLSearchParams();

    if (debouncedSearch) params.set("q", debouncedSearch);
    if (filters.category_ids.length > 0) params.set("category", filters.category_ids.join(","));
    if (filters.brand_ids.length > 0) params.set("brand", filters.brand_ids.join(","));
    if (filters.gender.length > 0) params.set("gender", filters.gender.join(","));
    if (filters.min_price) params.set("min_price", filters.min_price.toString());
    if (filters.max_price) params.set("max_price", filters.max_price.toString());
    if (filters.is_on_sale) params.set("sale", "true");
    if (sortBy !== "newest") params.set("sort", sortBy);
    if (currentPage > 1) params.set("page", currentPage.toString());

    router.push(`/catalog?${params.toString()}`, { scroll: false });
  }, [filters, sortBy, currentPage, debouncedSearch, router]);

  useEffect(() => {
    updateURL();
  }, [updateURL]);

  const handleFilterChange = (newFilters: {
    category_ids: string[];
    brand_ids: string[];
    gender: string[];
    min_price?: number;
    max_price?: number;
    is_on_sale: boolean;
  }) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleRemoveFilter = (type: string, value?: string) => {
    const newFilters = { ...filters };

    if (type === "category" && value) {
      newFilters.category_ids = newFilters.category_ids.filter((id) => id !== value);
    } else if (type === "brand" && value) {
      newFilters.brand_ids = newFilters.brand_ids.filter((id) => id !== value);
    } else if (type === "gender" && value) {
      newFilters.gender = newFilters.gender.filter((g) => g !== value);
    } else if (type === "price") {
      newFilters.min_price = undefined;
      newFilters.max_price = undefined;
    } else if (type === "sale") {
      newFilters.is_on_sale = false;
    }

    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleClearAll = () => {
    setFilters({
      category_ids: [],
      brand_ids: [],
      gender: [],
      min_price: undefined,
      max_price: undefined,
      is_on_sale: false,
    });
    setSearchQuery("");
    setDebouncedSearch("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    filters.category_ids.length > 0 ||
    filters.brand_ids.length > 0 ||
    filters.gender.length > 0 ||
    filters.min_price !== undefined ||
    filters.max_price !== undefined ||
    filters.is_on_sale ||
    debouncedSearch.length > 0;

  return (
    <div className="bg-cream dark:bg-neutral-950">
      {/* Breadcrumb */}
      <div className="border-b border-neutral-200 bg-white pt-[4.5rem] dark:border-neutral-800 dark:bg-neutral-900 lg:pt-20">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <nav className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 sm:text-sm">
            <Link
              href="/"
              className="transition-colors hover:text-primary-600"
            >
              {t.common.back}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-charcoal dark:text-white">{t.catalog.title}</span>
          </nav>
        </div>
      </div>

      {/* Page content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-2xl font-bold text-charcoal dark:text-white sm:text-3xl lg:text-4xl">
            {t.catalog.title}
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 sm:mt-2 sm:text-base">
            {isLoading ? t.common.loading : `${totalProducts} ${t.cart.item_many}`}
          </p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar filters (desktop) */}
          <aside className="hidden w-64 flex-shrink-0 lg:block">
            <div className="sticky top-24">
              <FiltersSidebar
                categories={categories}
                brands={brands}
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={handleClearAll}
              />
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1">
            {/* Search bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`${t.catalog.title}...`}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-10 pr-10 text-sm text-charcoal placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-500 sm:h-11"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setDebouncedSearch(""); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Toolbar */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Mobile filter button */}
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsFiltersOpen(true)}
                leftIcon={<SlidersHorizontal className="h-4 w-4" />}
                className="lg:hidden"
              >
                {t.catalog.filters}
                {hasActiveFilters && (
                  <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-xs text-white">
                    {filters.category_ids.length +
                      filters.brand_ids.length +
                      filters.gender.length +
                      (filters.min_price || filters.max_price ? 1 : 0) +
                      (filters.is_on_sale ? 1 : 0)}
                  </span>
                )}
              </Button>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">{t.catalog.sortBy}:</span>
                <SortSelect value={sortBy} onChange={setSortBy} />
              </div>
            </div>

            {/* Active filters */}
            {hasActiveFilters && (
              <div className="mb-6">
                <ActiveFilters
                  filters={filters}
                  categories={categories}
                  brands={brands}
                  onRemoveFilter={handleRemoveFilter}
                  onClearAll={handleClearAll}
                />
              </div>
            )}

            {/* Products grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: pageSize }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[3/4] rounded-md bg-neutral-200 dark:bg-neutral-800" />
                    <div className="mt-3 space-y-2">
                      <div className="h-3 w-16 rounded bg-neutral-200 dark:bg-neutral-800" />
                      <div className="h-4 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
                      <div className="h-4 w-20 rounded bg-neutral-200 dark:bg-neutral-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                <ProductGrid products={products} />

                {totalPages > 1 && (
                  <div className="mt-12">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex min-h-[400px] flex-col items-center justify-center rounded-md bg-white dark:bg-neutral-900 p-12 text-center"
              >
                <div className="mb-4 text-6xl">🔍</div>
                <h3 className="mb-2 font-display text-2xl font-semibold text-charcoal dark:text-white">
                  {t.catalog.noResults}
                </h3>
                <p className="mb-6 text-neutral-600 dark:text-neutral-400">
                  {t.catalog.noResultsDesc}
                </p>
                <Button variant="default" onClick={handleClearAll}>
                  {t.catalog.resetFilters}
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filters */}
      <FiltersSidebar
        isMobile
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        categories={categories}
        brands={brands}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleClearAll}
      />
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream dark:bg-neutral-950" />}>
      <CatalogContent />
    </Suspense>
  );
}
