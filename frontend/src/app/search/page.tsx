"use client";

export const dynamic = "force-dynamic";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/product/product-grid";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useProducts, useCategories, useBrands } from "@/hooks/use-products";
import { cn } from "@/lib/utils";
import type { Category, Brand } from "@/types";
import { useTranslation } from "@/hooks/use-translation";
import { useLanguageStore } from "@/store/language";

function SearchContent() {
  const searchParams = useSearchParams();
  const t = useTranslation();
  const locale = useLanguageStore((s) => s.locale);

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [activeQuery, setActiveQuery] = useState(searchParams.get("q") || "");
  const [showFilters, setShowFilters] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get("brand") || "");
  const [selectedGender, setSelectedGender] = useState(searchParams.get("gender") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("min_price") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max_price") || "");

  const { data: categoriesData } = useCategories();
  const { data: brandsData } = useBrands();
  const categories = categoriesData || [];
  const brands = brandsData || [];

  const { data: productsData, isLoading } = useProducts({
    search: activeQuery || undefined,
    category_id: selectedCategory || undefined,
    brand_id: selectedBrand || undefined,
    gender: selectedGender || undefined,
    min_price: minPrice ? parseFloat(minPrice) : undefined,
    max_price: maxPrice ? parseFloat(maxPrice) : undefined,
    page_size: 20,
  });

  const products = productsData?.items || [];
  const totalProducts = productsData?.total || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(query);
  };

  const clearFilters = () => {
    setSelectedCategory("");
    setSelectedBrand("");
    setSelectedGender("");
    setMinPrice("");
    setMaxPrice("");
    setActiveQuery("");
    setQuery("");
  };

  const hasFilters = selectedCategory || selectedBrand || selectedGender || minPrice || maxPrice;

  const genderOptions = [
    { value: "", label: t.searchUi.all },
    { value: "girls", label: t.catalog.girls },
    { value: "boys", label: t.catalog.boys },
  ];

  const pluralCategory = new Intl.PluralRules(locale === "uz" ? "uz" : "ru").select(totalProducts);
  const itemsWord =
    pluralCategory === "one" ? t.cart.item_one : pluralCategory === "few" ? t.cart.item_few : t.cart.item_many;
  const foundText = t.searchUi.found
    .replace("{query}", activeQuery)
    .replace("{count}", String(totalProducts))
    .replace("{items}", itemsWord);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-cream pt-20 dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Search header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="mb-3 font-display text-2xl font-bold text-charcoal dark:text-white sm:mb-4 sm:text-3xl">
              {t.searchUi.title}
            </h1>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400 sm:left-4" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.searchUi.placeholder}
                  className="h-10 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-primary-600 sm:h-12 sm:pl-12"
                  autoFocus
                />
              </div>
              <Button type="submit" size="lg" className="hidden sm:flex">
                {t.searchUi.find}
              </Button>
              <Button type="submit" size="sm" className="sm:hidden">
                <Search className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setShowFilters(!showFilters)}
                className={cn("hidden sm:flex", showFilters && "border-primary-500 text-primary-600")}
              >
                <SlidersHorizontal className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn("sm:hidden", showFilters && "border-primary-500 text-primary-600")}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <div className="flex gap-8">
            {/* Mobile filter overlay */}
            {showFilters && (
              <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setShowFilters(false)} />
            )}

            {/* Filters panel */}
            <motion.aside
              initial={false}
              animate={{
                width: showFilters ? 280 : 0,
                opacity: showFilters ? 1 : 0,
              }}
              transition={{ duration: 0.3 }}
              className={cn(
                "flex-shrink-0 overflow-hidden",
                showFilters ? "fixed inset-y-0 right-0 z-50 lg:relative lg:inset-auto lg:z-auto" : "hidden lg:block lg:w-0"
              )}
            >
              {showFilters && (
                <div className="h-full w-[280px] space-y-6 overflow-y-auto rounded-none border-l border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900 lg:h-auto lg:rounded-xl lg:border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-semibold text-charcoal dark:text-white">{t.catalog.filters}</h3>
                    <div className="flex items-center gap-2">
                      {hasFilters && (
                        <button onClick={clearFilters} className="text-xs text-primary-600 hover:underline">
                          {t.searchUi.reset}
                        </button>
                      )}
                      <button onClick={() => setShowFilters(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 lg:hidden">
                        <span className="text-lg">&times;</span>
                      </button>
                    </div>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t.catalog.gender}</label>
                    <div className="flex flex-wrap gap-2">
                      {genderOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setSelectedGender(opt.value)}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                            selectedGender === opt.value
                              ? "bg-primary-500 text-white"
                              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Categories */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t.searchUi.category}</label>
                    <div className="max-h-48 space-y-1 overflow-y-auto">
                      <button
                        onClick={() => setSelectedCategory("")}
                        className={cn(
                          "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                          !selectedCategory
                            ? "bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                            : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
                        )}
                      >
                        {t.searchUi.allCategories}
                      </button>
                      {categories.map((cat: Category) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={cn(
                            "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                            selectedCategory === cat.id
                              ? "bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                              : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
                          )}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Brands */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t.product.brand}</label>
                    <div className="max-h-48 space-y-1 overflow-y-auto">
                      <button
                        onClick={() => setSelectedBrand("")}
                        className={cn(
                          "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                          !selectedBrand
                            ? "bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                            : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
                        )}
                      >
                        {t.searchUi.allBrands}
                      </button>
                      {brands.map((brand: Brand) => (
                        <button
                          key={brand.id}
                          onClick={() => setSelectedBrand(brand.id)}
                          className={cn(
                            "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                            selectedBrand === brand.id
                              ? "bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                              : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
                          )}
                        >
                          {brand.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price range */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t.searchUi.priceLabel}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder={t.searchUi.priceFrom}
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-500 dark:focus:ring-primary-900"
                      />
                      <span className="text-neutral-400">—</span>
                      <input
                        type="number"
                        placeholder={t.searchUi.priceTo}
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-500 dark:focus:ring-primary-900"
                      />
                    </div>
                  </div>
                </div>
              )}
            </motion.aside>

            {/* Results */}
            <div className="flex-1">
              {activeQuery && (
                <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
                  {isLoading ? t.searchUi.searching : foundText}
                </p>
              )}

              {!activeQuery && !hasFilters && !isLoading && (
                <div className="space-y-6">
                  {/* Category quick links */}
                  <div>
                    <h2 className="mb-4 font-display text-xl font-semibold text-charcoal dark:text-white">{t.catalog.categories}</h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {categories.map((cat: Category) => (
                        <button
                          key={cat.id}
                          onClick={() => { setSelectedCategory(cat.id); setShowFilters(true); }}
                          className="rounded-xl border border-neutral-200 bg-white p-4 text-center transition-all hover:border-primary-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-primary-600"
                        >
                          <p className="text-sm font-medium text-charcoal dark:text-white">{cat.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gender quick links */}
                  <div>
                    <h2 className="mb-4 font-display text-xl font-semibold text-charcoal dark:text-white">{t.searchUi.byGender}</h2>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      {[
                        { value: "girls", label: t.catalog.girls, emoji: "👧", gradient: "from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 border-pink-200 dark:border-pink-800" },
                        { value: "boys", label: t.catalog.boys, emoji: "👦", gradient: "from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-sky-950/30 border-blue-200 dark:border-blue-800" },
                      ].map((g) => (
                        <button
                          key={g.value}
                          onClick={() => { setSelectedGender(g.value); setShowFilters(true); }}
                          className={cn(
                            "rounded-xl border bg-gradient-to-br p-4 text-center transition-all hover:shadow-md sm:p-6",
                            g.gradient
                          )}
                        >
                          <span className="text-2xl sm:text-3xl">{g.emoji}</span>
                          <p className="mt-1.5 text-xs font-medium text-charcoal dark:text-white sm:mt-2 sm:text-sm">{g.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {(activeQuery || hasFilters) && !isLoading && products.length > 0 && (
                <ProductGrid products={products} />
              )}

              {(activeQuery || hasFilters) && !isLoading && products.length === 0 && (
                <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl bg-white p-12 text-center dark:bg-neutral-900">
                  <div className="mb-4 text-5xl">🔍</div>
                  <h3 className="mb-2 font-display text-xl font-semibold text-charcoal dark:text-white">
                    {t.searchUi.nothingFound}
                  </h3>
                  <p className="mb-4 text-sm text-neutral-500">
                    {t.searchUi.nothingFoundDesc}
                  </p>
                  <Button variant="outline" onClick={clearFilters}>
                    {t.catalog.clearAll}
                  </Button>
                </div>
              )}

              {isLoading && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-[3/4] rounded-md bg-neutral-200 dark:bg-neutral-800" />
                      <div className="mt-3 space-y-2">
                        <div className="h-3 w-16 rounded bg-neutral-200 dark:bg-neutral-800" />
                        <div className="h-4 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream dark:bg-neutral-950" />}>
      <SearchContent />
    </Suspense>
  );
}
