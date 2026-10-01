"use client";

import React, { useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { useInfiniteProducts } from "@/hooks/use-products";
import { useTranslation } from "@/hooks/use-translation";

interface RecommendationFeedProps {
  gender: "girls" | "boys";
}

export function RecommendationFeed({ gender }: RecommendationFeedProps) {
  const t = useTranslation();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteProducts({
    gender,
    page_size: 20,
    sort_by: "popular",
  });

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allProducts = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white sm:text-xl">
          {t.catalogUi.recommendations.title}
        </h2>
        {total > 0 && (
          <span className="text-sm text-neutral-400">
            {t.catalogUi.recommendations.count.replace("{count}", String(total))}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
        {isLoading &&
          Array.from({ length: 10 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}

        {allProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}

        {isFetchingNextPage &&
          Array.from({ length: 5 }).map((_, i) => (
            <ProductCardSkeleton key={`loading-${i}`} />
          ))}
      </div>

      <div ref={loadMoreRef} className="flex justify-center py-8">
        {isFetchingNextPage && (
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        )}
        {!hasNextPage && allProducts.length > 0 && (
          <p className="text-sm text-neutral-400">
            {t.catalogUi.recommendations.allShown}
          </p>
        )}
      </div>
    </div>
  );
}
