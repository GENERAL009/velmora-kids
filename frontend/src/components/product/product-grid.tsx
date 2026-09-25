"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ProductCard } from "./product-card";
import { ProductGridSkeleton } from "@/components/ui/skeleton";
import type { Product } from "@/types";
import { PackageOpen } from "lucide-react";

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  skeletonCount?: number;
  className?: string;
  columns?: 2 | 3 | 4;
}

export function ProductGrid({
  products,
  isLoading = false,
  skeletonCount = 8,
  className,
  columns = 4,
}: ProductGridProps) {
  if (isLoading) {
    return <ProductGridSkeleton count={skeletonCount} />;
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <PackageOpen className="h-16 w-16 text-neutral-200" strokeWidth={1} />
        <h3 className="mt-4 font-display text-lg font-semibold text-neutral-700 dark:text-neutral-300">
          Товары не найдены
        </h3>
        <p className="mt-1 text-sm text-neutral-400">
          Попробуйте изменить параметры поиска или фильтры
        </p>
      </div>
    );
  }

  const colsClass = {
    2: "grid-cols-2 sm:grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  };

  return (
    <div
      className={cn(
        "grid gap-4 sm:gap-6 lg:gap-8",
        colsClass[columns],
        className
      )}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
