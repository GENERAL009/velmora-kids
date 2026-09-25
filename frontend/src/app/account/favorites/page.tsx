"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { Heart, ShoppingCart, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { apiGet, apiDelete } from "@/lib/api";

interface ApiFavorite {
  id: string;
  user_id: string;
  product_id: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    selling_price: number;
    discount_price?: number | null;
  } | null;
  created_at: string;
}

function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: () => apiGet<ApiFavorite[]>("/favorites"),
    retry: 1,
  });
}

export default function FavoritesPage() {
  const { data: favorites = [], isLoading } = useFavorites();
  const queryClient = useQueryClient();

  const removeFavorite = async (productId: string) => {
    try {
      await apiDelete(`/favorites/${productId}`);
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    } catch {
      // silently fail
    }
  };

  const getDiscountPercentage = (price: number, comparePrice?: number | null) => {
    if (!comparePrice || comparePrice <= price) return 0;
    return Math.round(((comparePrice - price) / comparePrice) * 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 shadow-sm">
          <h1 className="mb-2 font-display text-2xl text-charcoal dark:text-white lg:text-3xl">Избранное</h1>
          <p className="text-neutral-600 dark:text-neutral-400">Загрузка...</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
              <div className="aspect-[3/4] bg-neutral-200 dark:bg-neutral-800" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
                <div className="h-5 w-full bg-neutral-200 dark:bg-neutral-700 rounded" />
                <div className="h-6 w-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 shadow-sm">
          <h1 className="mb-2 font-display text-2xl text-charcoal dark:text-white lg:text-3xl">Избранное</h1>
          <p className="text-neutral-600 dark:text-neutral-400">Сохраняйте понравившиеся товары для быстрого доступа</p>
        </div>

        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-12 text-center shadow-sm">
          <Heart className="mx-auto mb-4 h-16 w-16 text-neutral-300 dark:text-neutral-600" />
          <h2 className="mb-2 font-display text-xl text-charcoal dark:text-white">Список избранного пуст</h2>
          <p className="mb-6 text-neutral-600 dark:text-neutral-400">Добавляйте товары в избранное, чтобы не потерять их</p>
          <Link href="/catalog">
            <Button size="lg">Перейти в каталог</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <h1 className="mb-2 font-display text-2xl text-charcoal dark:text-white lg:text-3xl">Избранное</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          {favorites.length} {favorites.length === 1 ? "товар" : "товара"} в избранном
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {favorites.map((fav) => {
          const product = fav.product;
          if (!product) return null;

          const price = product.discount_price && product.discount_price > 0 && product.discount_price < product.selling_price
            ? product.discount_price
            : product.selling_price;
          const comparePrice = product.discount_price && product.discount_price < product.selling_price
            ? product.selling_price
            : undefined;
          const discount = getDiscountPercentage(price, comparePrice);

          return (
            <div
              key={fav.id}
              className="group relative overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm transition-all hover:shadow-lg"
            >
              <button
                onClick={() => removeFavorite(fav.product_id)}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-sm backdrop-blur-sm transition-all hover:bg-red-50 hover:scale-110"
                aria-label="Удалить из избранного"
              >
                <X className="h-4 w-4" />
              </button>

              {discount > 0 && (
                <div className="absolute left-3 top-3 z-10 rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white shadow-sm">
                  -{discount}%
                </div>
              )}

              <Link href={`/product/${product.slug}`}>
                <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-primary-100 via-secondary-100 to-accent-100">
                  <div className="flex h-full w-full items-center justify-center">
                    <Heart className="h-16 w-16 text-primary-200" />
                  </div>
                </div>
              </Link>

              <div className="p-4">
                <Link href={`/product/${product.slug}`}>
                  <h3 className="mb-2 line-clamp-2 font-medium text-charcoal dark:text-white transition-colors hover:text-primary-600">
                    {product.name}
                  </h3>
                </Link>

                <div className="mb-3 flex items-baseline gap-2">
                  <span className="font-display text-xl font-semibold text-charcoal dark:text-white">
                    {formatPrice(price)}
                  </span>
                  {comparePrice && (
                    <span className="text-sm text-neutral-500 line-through">
                      {formatPrice(comparePrice)}
                    </span>
                  )}
                </div>

                <Link href={`/product/${product.slug}`}>
                  <Button size="sm" className="w-full">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Перейти к товару
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 shadow-sm">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Хотите найти что-то новое?</p>
          <Link href="/catalog">
            <Button variant="outline">Продолжить покупки</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
