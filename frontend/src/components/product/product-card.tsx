"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice, getDiscountPercentage } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth";
import { apiPost, apiDelete } from "@/lib/api";
import { saveDeferredAction } from "@/store/deferred-action";
import toast from "react-hot-toast";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  className?: string;
  isLoading?: boolean;
}

export function ProductCard({ product, className, isLoading }: ProductCardProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const favorites: string[] = JSON.parse(localStorage.getItem("velmora-favorites") || "[]");
    setIsFavorite(favorites.includes(product.id));
  }, [product.id]);

  const toggleFavorite = () => {
    if (!isAuthenticated) {
      saveDeferredAction({
        type: "favorite",
        productId: product.id,
        returnUrl: window.location.pathname,
      });
      toast("Войдите, чтобы сохранить в избранное", { icon: "❤️" });
      router.push("/auth/login");
      return;
    }
    const favorites: string[] = JSON.parse(localStorage.getItem("velmora-favorites") || "[]");
    const next = isFavorite ? favorites.filter((id) => id !== product.id) : [...favorites, product.id];
    localStorage.setItem("velmora-favorites", JSON.stringify(next));
    setIsFavorite(!isFavorite);
    if (isFavorite) {
      apiDelete(`/favorites/${product.id}`).catch(() => {});
    } else {
      apiPost(`/favorites/${product.id}`).catch(() => {});
    }
  };

  if (isLoading) {
    return <ProductCardSkeleton />;
  }

  const primaryImage = product.images?.find((img) => img.is_primary) || product.images?.[0];
  const secondaryImage = product.images?.find(
    (img) => !img.is_primary && img.sort_order === 1
  ) || product.images?.[1];

  const discount = product.compare_at_price
    ? getDiscountPercentage(product.price, product.compare_at_price)
    : 0;

  const availableColors = product.variants
    ?.filter((v) => v.is_active && v.stock > 0)
    ?.map((v) => v.color)
    ?.filter((color, idx, arr) => color && arr.findIndex((c) => c?.id === color?.id) === idx)
    ?.slice(0, 5);

  return (
    <motion.div
      className={cn("group relative", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Image container */}
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-neutral-100">
          {/* Primary image */}
          {primaryImage && !imageError ? (
            <Image
              src={primaryImage.file_path}
              alt={primaryImage.alt_text || product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={cn(
                "object-cover transition-all duration-500",
                isHovered && secondaryImage ? "opacity-0" : "opacity-100"
              )}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-50">
              <span className="font-display text-lg text-neutral-300">
                Velmora
              </span>
            </div>
          )}

          {/* Secondary image (hover) */}
          {secondaryImage && !imageError && (
            <Image
              src={secondaryImage.file_path}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={cn(
                "absolute inset-0 object-cover transition-all duration-500",
                isHovered ? "opacity-100 scale-105" : "opacity-0 scale-100"
              )}
            />
          )}

          {/* Overlay gradient on hover */}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-charcoal/20 to-transparent transition-opacity duration-300",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          />

          {/* Badges */}
          <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
            {product.is_new && <Badge variant="new">New</Badge>}
            {product.is_bestseller && (
              <Badge variant="bestseller">Bestseller</Badge>
            )}
            {discount > 0 && <Badge variant="sale">-{discount}%</Badge>}
          </div>

          {/* Favorite button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite();
            }}
            className={cn(
              "absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300",
              isFavorite
                ? "bg-primary-500 text-white shadow-sm"
                : "bg-white/80 text-neutral-500 backdrop-blur-sm hover:bg-white hover:text-primary-500"
            )}
            aria-label={isFavorite ? "Удалить из избранного" : "В избранное"}
          >
            <Heart
              className={cn("h-4 w-4", isFavorite && "fill-current")}
            />
          </button>

          {/* Quick view button */}
          <div
            className={cn(
              "absolute bottom-3 left-3 right-3 transition-all duration-300",
              isHovered
                ? "translate-y-0 opacity-100"
                : "translate-y-2 opacity-0"
            )}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/product/${product.slug}`);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-sm bg-white/90 px-4 py-2.5 text-xs font-medium text-charcoal backdrop-blur-sm transition-colors hover:bg-white"
            >
              <Eye className="h-3.5 w-3.5" />
              Подробнее
            </button>
          </div>
        </div>
      </Link>

      {/* Info */}
      <div className="mt-3 space-y-1">
        {/* Brand */}
        {product.brand && (
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
            {product.brand.name}
          </p>
        )}

        {/* Name */}
        <Link href={`/product/${product.slug}`}>
          <h3 className="text-sm font-medium text-neutral-800 transition-colors hover:text-primary-600 dark:text-neutral-200 line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-semibold",
              discount > 0 ? "text-primary-600" : "text-charcoal dark:text-white"
            )}
          >
            {formatPrice(product.price)}
          </span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-xs text-neutral-400 line-through">
              {formatPrice(product.compare_at_price)}
            </span>
          )}
        </div>

        {/* Color swatches */}
        {availableColors && availableColors.length > 0 && (
          <div className="flex items-center gap-1 pt-1">
            {availableColors.map((color) => (
              <span
                key={color.id}
                className="h-4 w-4 rounded-full border border-neutral-200 dark:border-neutral-700"
                style={{ backgroundColor: color.hex_code }}
                title={color.name}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
