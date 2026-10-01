"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { Heart, ShoppingCart, X, ImageOff } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { apiGet, apiDelete } from "@/lib/api";
import { useTranslation } from "@/hooks/use-translation";
import { useLanguageStore } from "@/store/language";

interface ApiFavorite {
  id: string;
  user_id: string;
  product_id: string;
  product?: {
    id: string;
    name: string;
    name_uz?: string | null;
    name_ru?: string | null;
    slug: string;
    selling_price: number;
    discount_price?: number | null;
    status?: string | null;
    image?: string | null;
    images?: { file_path: string; is_primary: boolean; sort_order: number }[];
  } | null;
  created_at: string;
}

const CARD = "rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900";

function FavoriteImage({ src, alt }: { src?: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-neutral-800 dark:via-neutral-900 dark:to-neutral-800">
        <ImageOff className="h-12 w-12 text-neutral-300 dark:text-neutral-600" />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
      className="object-cover transition-transform duration-500 group-hover:scale-105"
      onError={() => setFailed(true)}
      unoptimized
    />
  );
}

export default function FavoritesPage() {
  const t = useTranslation();
  const f = t.profile.favorites;
  const locale = useLanguageStore((s) => s.locale);
  const queryClient = useQueryClient();
  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => apiGet<ApiFavorite[]>("/favorites"),
    retry: 1,
  });

  const removeFavorite = async (productId: string) => {
    // optimistic: hide the card right away
    queryClient.setQueryData<ApiFavorite[]>(["favorites"], (old) => (old ?? []).filter((x) => x.product_id !== productId));
    try {
      await apiDelete(`/favorites/${productId}`);
      toast.success(f.removed);
    } catch {
      toast.error(t.profile.genericError);
    } finally {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["account"] });
    }
  };

  const header = (subtitle: string) => (
    <div className={CARD}>
      <h1 className="mb-2 font-display text-2xl text-charcoal dark:text-white lg:text-3xl">{f.title}</h1>
      <p className="text-neutral-600 dark:text-neutral-400">{subtitle}</p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {header(t.common.loading)}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
              <div className="aspect-square bg-neutral-200 dark:bg-neutral-800" />
              <div className="space-y-2 p-4">
                <div className="h-5 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
                <div className="h-6 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const visible = favorites.filter((fav) => fav.product);

  if (visible.length === 0) {
    return (
      <div className="space-y-6">
        {header(f.subtitle)}
        <div className={`${CARD} p-12 text-center`}>
          <Heart className="mx-auto mb-4 h-16 w-16 text-neutral-300 dark:text-neutral-600" />
          <h2 className="mb-2 font-display text-xl text-charcoal dark:text-white">{f.emptyTitle}</h2>
          <p className="mb-6 text-neutral-600 dark:text-neutral-400">{f.emptyDesc}</p>
          <Link href="/catalog">
            <Button size="lg">{t.cart.goToCatalog}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header(f.count.replace("{count}", String(visible.length)))}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6">
        {visible.map((fav) => {
          const product = fav.product!;
          const name = (locale === "uz" ? product.name_uz : product.name_ru) || product.name;
          const selling = Number(product.selling_price) || 0;
          const disc = product.discount_price != null ? Number(product.discount_price) : null;
          const hasDiscount = disc != null && disc > 0 && disc < selling;
          const price = hasDiscount ? disc! : selling;
          const discountPct = hasDiscount ? Math.round(((selling - price) / selling) * 100) : 0;
          const unavailable = product.status != null && product.status !== "active";
          const image =
            product.image ||
            product.images?.find((i) => i.is_primary)?.file_path ||
            product.images?.[0]?.file_path;

          return (
            <div
              key={fav.id}
              className="group relative flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition-all hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
            >
              <button
                onClick={() => removeFavorite(fav.product_id)}
                className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-sm backdrop-blur-sm transition-all hover:scale-110 hover:bg-red-50 dark:bg-neutral-900/80"
                aria-label={f.remove}
                title={f.remove}
              >
                <X className="h-4 w-4" />
              </button>

              {discountPct > 0 && (
                <div className="absolute left-2 top-2 z-10 rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white shadow-sm">
                  -{discountPct}%
                </div>
              )}

              <Link href={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden bg-neutral-50 dark:bg-neutral-800">
                <FavoriteImage src={image} alt={name} />
                {unavailable && (
                  <span className="absolute inset-x-0 bottom-0 bg-neutral-900/70 py-1.5 text-center text-xs font-medium text-white">
                    {f.unavailable}
                  </span>
                )}
              </Link>

              <div className="flex flex-1 flex-col p-3 sm:p-4">
                <Link href={`/product/${product.slug}`}>
                  <h3 className="mb-2 line-clamp-2 text-sm font-medium text-charcoal transition-colors hover:text-primary-600 dark:text-white sm:text-base">
                    {name}
                  </h3>
                </Link>

                <div className="mb-3 mt-auto flex flex-wrap items-baseline gap-x-2">
                  <span className="font-display text-lg font-semibold text-charcoal dark:text-white sm:text-xl">
                    {formatPrice(price)}
                  </span>
                  {hasDiscount && (
                    <span className="text-xs text-neutral-500 line-through sm:text-sm">{formatPrice(selling)}</span>
                  )}
                </div>

                <Link href={`/product/${product.slug}`}>
                  <Button size="sm" className="w-full px-2 sm:px-4">
                    <ShoppingCart className="mr-2 hidden h-4 w-4 flex-shrink-0 sm:block" />
                    <span className="truncate">{f.goToProduct}</span>
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className={CARD}>
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{f.lookForMore}</p>
          <Link href="/catalog">
            <Button variant="outline">{f.continueShopping}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
