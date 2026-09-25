"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Category, Brand } from "@/types";

interface FiltersSidebarProps {
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  categories: Category[];
  brands: Brand[];
  filters: {
    category_ids: string[];
    brand_ids: string[];
    gender: string[];
    min_price?: number;
    max_price?: number;
    is_on_sale: boolean;
  };
  onFilterChange: (filters: FiltersSidebarProps["filters"]) => void;
  onApply?: () => void;
  onReset: () => void;
}

export function FiltersSidebar({
  isMobile = false,
  isOpen = true,
  onClose,
  categories,
  brands,
  filters,
  onFilterChange,
  onApply,
  onReset,
}: FiltersSidebarProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleCategoryToggle = (categoryId: string) => {
    const newCategoryIds = localFilters.category_ids.includes(categoryId)
      ? localFilters.category_ids.filter((id) => id !== categoryId)
      : [...localFilters.category_ids, categoryId];

    const updated = { ...localFilters, category_ids: newCategoryIds };
    setLocalFilters(updated);
    if (!isMobile) onFilterChange(updated);
  };

  const handleBrandToggle = (brandId: string) => {
    const newBrandIds = localFilters.brand_ids.includes(brandId)
      ? localFilters.brand_ids.filter((id) => id !== brandId)
      : [...localFilters.brand_ids, brandId];

    const updated = { ...localFilters, brand_ids: newBrandIds };
    setLocalFilters(updated);
    if (!isMobile) onFilterChange(updated);
  };

  const handleGenderToggle = (gender: string) => {
    const newGender = localFilters.gender.includes(gender)
      ? localFilters.gender.filter((g) => g !== gender)
      : [...localFilters.gender, gender];

    const updated = { ...localFilters, gender: newGender };
    setLocalFilters(updated);
    if (!isMobile) onFilterChange(updated);
  };

  const handlePriceChange = (field: "min_price" | "max_price", value: string) => {
    const numValue = value ? parseFloat(value) : undefined;
    const updated = { ...localFilters, [field]: numValue };
    setLocalFilters(updated);
    if (!isMobile) onFilterChange(updated);
  };

  const handleSaleToggle = () => {
    const updated = { ...localFilters, is_on_sale: !localFilters.is_on_sale };
    setLocalFilters(updated);
    if (!isMobile) onFilterChange(updated);
  };

  const handleApply = () => {
    onFilterChange(localFilters);
    onApply?.();
    onClose?.();
  };

  const handleReset = () => {
    const resetFilters = {
      category_ids: [],
      brand_ids: [],
      gender: [],
      min_price: undefined,
      max_price: undefined,
      is_on_sale: false,
    };
    setLocalFilters(resetFilters);
    onReset();
    if (isMobile) onClose?.();
  };

  const content = (
    <div className="flex h-full flex-col">
      {/* Header (mobile only) */}
      {isMobile && (
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 p-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
            <h2 className="text-lg font-semibold text-charcoal dark:text-white">Фильтры</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Filters content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-0">
        <div className="space-y-6">
          {/* Categories */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
              Категория
            </h3>
            <div className="space-y-2">
              {categories.slice(0, 8).map((category) => (
                <label
                  key={category.id}
                  className="flex cursor-pointer items-center gap-2.5 transition-colors hover:text-primary-600"
                >
                  <input
                    type="checkbox"
                    checked={localFilters.category_ids.includes(category.id)}
                    onChange={() => handleCategoryToggle(category.id)}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-500 transition-colors focus:ring-2 focus:ring-primary-200 focus:ring-offset-0"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    {category.name}
                  </span>
                  {category.product_count !== undefined && (
                    <span className="ml-auto text-xs text-neutral-400">
                      {category.product_count}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div className="space-y-3 border-t border-neutral-100 dark:border-neutral-800 pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
              Пол
            </h3>
            <div className="space-y-2">
              {[
                { value: "girls", label: "Девочки" },
                { value: "boys", label: "Мальчики" },
                { value: "unisex", label: "Унисекс" },
              ].map((gender) => (
                <label
                  key={gender.value}
                  className="flex cursor-pointer items-center gap-2.5 transition-colors hover:text-primary-600"
                >
                  <input
                    type="checkbox"
                    checked={localFilters.gender.includes(gender.value)}
                    onChange={() => handleGenderToggle(gender.value)}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-500 transition-colors focus:ring-2 focus:ring-primary-200 focus:ring-offset-0"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">{gender.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-3 border-t border-neutral-100 dark:border-neutral-800 pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
              Цена
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="От"
                value={localFilters.min_price || ""}
                onChange={(e) => handlePriceChange("min_price", e.target.value)}
                className="h-10 w-full rounded-sm border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
              />
              <span className="text-neutral-400">—</span>
              <input
                type="number"
                placeholder="До"
                value={localFilters.max_price || ""}
                onChange={(e) => handlePriceChange("max_price", e.target.value)}
                className="h-10 w-full rounded-sm border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
              />
            </div>
          </div>

          {/* Brands */}
          <div className="space-y-3 border-t border-neutral-100 dark:border-neutral-800 pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
              Бренд
            </h3>
            <div className="space-y-2">
              {brands.slice(0, 10).map((brand) => (
                <label
                  key={brand.id}
                  className="flex cursor-pointer items-center gap-2.5 transition-colors hover:text-primary-600"
                >
                  <input
                    type="checkbox"
                    checked={localFilters.brand_ids.includes(brand.id)}
                    onChange={() => handleBrandToggle(brand.id)}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-500 transition-colors focus:ring-2 focus:ring-primary-200 focus:ring-offset-0"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">{brand.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sale Toggle */}
          <div className="space-y-3 border-t border-neutral-100 dark:border-neutral-800 pt-6">
            <label className="flex cursor-pointer items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                Со скидкой
              </span>
              <div
                onClick={handleSaleToggle}
                className={cn(
                  "relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors",
                  localFilters.is_on_sale ? "bg-primary-500" : "bg-neutral-300"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    localFilters.is_on_sale ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Footer buttons */}
      <div className="border-t border-neutral-200 dark:border-neutral-700 p-4 lg:hidden">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={handleReset}
            className="flex-1"
          >
            Сбросить
          </Button>
          <Button
            variant="default"
            size="md"
            onClick={handleApply}
            className="flex-1"
          >
            Применить
          </Button>
        </div>
      </div>

      {/* Desktop reset link */}
      {!isMobile && (
        <div className="mt-6">
          <button
            onClick={handleReset}
            className="text-sm text-primary-600 transition-colors hover:text-primary-700 hover:underline"
          >
            Сбросить все фильтры
          </button>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={onClose}
              className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-sm"
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed bottom-0 left-0 top-0 z-50 w-full max-w-sm bg-white dark:bg-neutral-900 shadow-elevated"
            >
              {content}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return <div className="space-y-6">{content}</div>;
}
