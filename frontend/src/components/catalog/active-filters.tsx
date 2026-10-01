"use client";

import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category, Brand } from "@/types";
import { useTranslation } from "@/hooks/use-translation";
import { useLanguageStore } from "@/store/language";

interface ActiveFilter {
  type: "category" | "brand" | "gender" | "price" | "sale";
  value: string;
  label: string;
}

interface ActiveFiltersProps {
  filters: {
    category_ids: string[];
    brand_ids: string[];
    gender: string[];
    min_price?: number;
    max_price?: number;
    is_on_sale: boolean;
  };
  categories: Category[];
  brands: Brand[];
  onRemoveFilter: (type: string, value?: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function ActiveFilters({
  filters,
  categories,
  brands,
  onRemoveFilter,
  onClearAll,
  className,
}: ActiveFiltersProps) {
  const t = useTranslation();
  const locale = useLanguageStore((s) => s.locale);
  const localizedName = (c: { name: string; name_uz?: string; name_ru?: string }) =>
    (locale === "uz" ? c.name_uz : c.name_ru) || c.name;
  const genderLabels: Record<string, string> = {
    girls: t.catalogUi.gender.girls,
    boys: t.catalogUi.gender.boys,
    both: t.catalogUi.gender.both,
  };
  const activeFilters: ActiveFilter[] = [];

  // Add category filters
  filters.category_ids.forEach((id) => {
    const category = categories.find((c) => c.id === id);
    if (category) {
      activeFilters.push({
        type: "category",
        value: id,
        label: localizedName(category),
      });
    }
  });

  // Add brand filters
  filters.brand_ids.forEach((id) => {
    const brand = brands.find((b) => b.id === id);
    if (brand) {
      activeFilters.push({
        type: "brand",
        value: id,
        label: brand.name,
      });
    }
  });

  // Add gender filters
  filters.gender.forEach((gender) => {
    activeFilters.push({
      type: "gender",
      value: gender,
      label: genderLabels[gender] || gender,
    });
  });

  // Add price filter
  if (filters.min_price !== undefined || filters.max_price !== undefined) {
    const priceLabel = [];
    if (filters.min_price) priceLabel.push(t.catalogUi.priceFrom.replace("{value}", filters.min_price.toLocaleString()));
    if (filters.max_price) priceLabel.push(t.catalogUi.priceTo.replace("{value}", filters.max_price.toLocaleString()));

    activeFilters.push({
      type: "price",
      value: "price",
      label: priceLabel.join(" "),
    });
  }

  // Add sale filter
  if (filters.is_on_sale) {
    activeFilters.push({
      type: "sale",
      value: "sale",
      label: t.catalog.onSale,
    });
  }

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
        {t.catalogUi.activeFilters}
      </span>

      {activeFilters.map((filter, index) => (
        <div
          key={`${filter.type}-${filter.value}-${index}`}
          className="group flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm text-primary-700 transition-colors hover:border-primary-300 hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-400 dark:hover:border-primary-700 dark:hover:bg-primary-950/50"
        >
          <span className="font-medium">{filter.label}</span>
          <button
            onClick={() => onRemoveFilter(filter.type, filter.value)}
            className="flex h-4 w-4 items-center justify-center rounded-full text-primary-600 transition-colors hover:bg-primary-200"
            aria-label={t.catalogUi.removeFilter.replace("{label}", filter.label)}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}

      {activeFilters.length > 1 && (
        <button
          onClick={onClearAll}
          className="ml-2 text-sm font-medium text-neutral-500 underline-offset-2 transition-colors hover:text-primary-600 hover:underline"
        >
          {t.catalog.clearAll}
        </button>
      )}
    </div>
  );
}
