"use client";

export const dynamic = "force-dynamic";

import React, { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Heart,
  ShoppingBag,
  Share2,
  Shield,
  Truck,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductGallery } from "@/components/product/product-gallery";
import { ColorSelector } from "@/components/product/color-selector";
import { QuantitySelector } from "@/components/product/quantity-selector";
import { ProductTabs } from "@/components/product/product-tabs";
import { ProductGrid } from "@/components/product/product-grid";
import { useProduct, useProducts } from "@/hooks/use-products";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { apiPost, apiDelete } from "@/lib/api";
import { saveDeferredAction } from "@/store/deferred-action";
import toast from "react-hot-toast";
import { cn, formatPrice, getDiscountPercentage } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";
import { useLanguageStore } from "@/store/language";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const t = useTranslation();
  const locale = useLanguageStore((s) => s.locale);

  const { data: product, isLoading, error } = useProduct(slug);
  const addItem = useCartStore((state) => state.addItem);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    if (product) {
      const favorites: string[] = JSON.parse(localStorage.getItem("velmora-favorites") || "[]");
      setIsFavorite(favorites.includes(product.id));
      if (product.variants.length === 1 && !selectedColor) {
        setSelectedColor(product.variants[0].color_id);
      }
    }
  }, [product, selectedColor]);

  const toggleFavorite = () => {
    if (!product) return;
    if (!isAuthenticated) {
      saveDeferredAction({
        type: "favorite",
        productId: product.id,
        returnUrl: `/product/${slug}`,
      });
      toast(t.productPage.loginToFavorite, { icon: "❤️" });
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

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: productName, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setShareMessage(t.productPage.linkCopied);
      setTimeout(() => setShareMessage(""), 2000);
    }
  };

  useEffect(() => {
    if (slug) {
      apiPost(`/products/${slug}/view`).catch(() => {});
      try {
        const key = "velmora-recently-viewed";
        const viewed: string[] = JSON.parse(localStorage.getItem(key) || "[]");
        const updated = [slug, ...viewed.filter((s) => s !== slug)].slice(0, 20);
        localStorage.setItem(key, JSON.stringify(updated));
      } catch {}
    }
  }, [slug]);

  const { data: relatedData } = useProducts({
    category_id: product?.category_id,
    page_size: 4,
  });

  const relatedProducts = useMemo(
    () => (relatedData?.items || []).filter((p) => p.id !== product?.id).slice(0, 4),
    [relatedData, product?.id]
  );

  const discount = product?.compare_at_price
    ? getDiscountPercentage(product.price, product.compare_at_price)
    : 0;

  const selectedVariant = useMemo(() => {
    if (!product || !selectedColor) return null;
    return product.variants.find(
      (v) => v.color_id === selectedColor
    );
  }, [product, selectedColor]);

  const canAddToCart = !!selectedColor;

  const productName = product
    ? (locale === "uz" ? product.name_uz : product.name_ru) || product.name
    : "";
  const productDescription = product
    ? (locale === "uz" ? product.description_uz : product.description_ru) || product.description
    : "";

  if (isLoading) {
    return (
      <div className="bg-cream pt-[4.5rem] dark:bg-neutral-950 lg:pt-20">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
            <div className="animate-pulse">
              <div className="aspect-[3/4] rounded-md bg-neutral-200 dark:bg-neutral-800" />
              <div className="mt-3 flex gap-2 sm:mt-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 w-14 rounded-sm bg-neutral-200 dark:bg-neutral-800 sm:h-[100px] sm:w-[80px]" />
                ))}
              </div>
            </div>
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-20 rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-8 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-6 w-32 rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-20 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-40 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-cream dark:bg-neutral-950 px-4 text-center">
        <div className="mb-4 text-6xl dark:text-neutral-400">404</div>
        <h1 className="mb-2 font-display text-3xl font-bold text-charcoal dark:text-white">
          {t.productPage.notFoundTitle}
        </h1>
        <p className="mb-6 text-neutral-600 dark:text-neutral-400">
          {t.productPage.notFoundDesc}
        </p>
        <Link href="/catalog">
          <Button variant="default">{t.cart.goToCatalog}</Button>
        </Link>
      </div>
    );
  }

  const sp = t.productPage.specs;
  const specifications: Record<string, string> = {
    [t.product.sku]: product.sku,
    ...(product.gender ? { [t.catalog.gender]: product.gender === "girls" ? t.catalog.girls : product.gender === "boys" ? t.catalog.boys : sp.genderBoth } : {}),
    ...(product.age_min ? { [sp.ageFrom]: sp.months.replace("{n}", String(product.age_min)) } : {}),
    ...(product.age_max ? { [sp.ageTo]: sp.months.replace("{n}", String(product.age_max)) } : {}),
    ...(product.max_weight_kg ? { [sp.maxWeight]: sp.kg.replace("{n}", String(product.max_weight_kg)) } : {}),
    ...(product.product_weight_kg ? { [sp.productWeight]: sp.kg.replace("{n}", String(product.product_weight_kg)) } : {}),
    ...(product.dimensions ? { [t.product.dimensions]: product.dimensions } : {}),
    ...(product.wheel_type ? { [t.product.wheelType]: product.wheel_type } : {}),
    ...(product.wheel_count ? { [t.product.wheelCount]: String(product.wheel_count) } : {}),
    ...(product.max_speed_kmh ? { [sp.maxSpeed]: sp.kmh.replace("{n}", String(product.max_speed_kmh)) } : {}),
    ...(product.battery_type ? { [sp.battery]: product.battery_type } : {}),
    ...(product.has_remote_control ? { [t.product.remoteControl]: sp.yes } : {}),
    ...(product.has_lights ? { [t.product.lights]: sp.yes } : {}),
    ...(product.has_music ? { [sp.music]: sp.yes } : {}),
  };

  return (
    <div className="bg-cream dark:bg-neutral-950">
      {/* Breadcrumb */}
      <div className="border-b border-neutral-200 bg-white pt-[4.5rem] dark:border-neutral-800 dark:bg-neutral-900 lg:pt-20">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <nav className="flex items-center gap-1.5 overflow-x-auto text-xs text-neutral-600 dark:text-neutral-400 sm:gap-2 sm:text-sm">
            <Link href="/" className="flex-shrink-0 transition-colors hover:text-primary-600">
              {t.productPage.home}
            </Link>
            <ChevronRight className="h-3 w-3 flex-shrink-0 sm:h-4 sm:w-4" />
            <Link
              href="/catalog"
              className="flex-shrink-0 transition-colors hover:text-primary-600"
            >
              {t.catalog.title}
            </Link>
            {product.category && (
              <>
                <ChevronRight className="h-3 w-3 flex-shrink-0 sm:h-4 sm:w-4" />
                <Link
                  href={`/catalog?category=${product.category_id}`}
                  className="flex-shrink-0 transition-colors hover:text-primary-600"
                >
                  {product.category.name}
                </Link>
              </>
            )}
            <ChevronRight className="h-3 w-3 flex-shrink-0 sm:h-4 sm:w-4" />
            <span className="truncate font-medium text-charcoal dark:text-white">
              {productName}
            </span>
          </nav>
        </div>
      </div>

      {/* Product main section */}
      <div className="mx-auto max-w-7xl overflow-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Gallery */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ProductGallery
              images={product.images}
              productName={productName}
            />
          </motion.div>

          {/* Product info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="min-w-0 space-y-6"
          >
            {/* Brand & badges */}
            <div className="flex items-center gap-3">
              {product.brand && (
                <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                  {product.brand.name}
                </span>
              )}
              <div className="flex gap-2">
                {product.is_new && <Badge variant="new">{t.common.new}</Badge>}
                {product.is_bestseller && (
                  <Badge variant="bestseller">{t.productPage.bestseller}</Badge>
                )}
                {discount > 0 && (
                  <Badge variant="sale">-{discount}%</Badge>
                )}
              </div>
            </div>

            {/* Name */}
            <h1 className="font-display text-2xl font-bold text-charcoal dark:text-white sm:text-3xl">
              {productName}
            </h1>

            {/* SKU */}
            <p className="text-xs text-neutral-400">
              {t.product.sku}: {product.sku}
            </p>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-charcoal dark:text-white">
                {formatPrice(product.price)}
              </span>
              {product.compare_at_price &&
                product.compare_at_price > product.price && (
                  <span className="text-lg text-neutral-400 line-through">
                    {formatPrice(product.compare_at_price)}
                  </span>
                )}
            </div>

            {/* Short description */}
            {product.short_description && (
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {product.short_description}
              </p>
            )}

            <hr className="border-neutral-200 dark:border-neutral-700" />

            {/* Color selector */}
            {product.variants.length > 0 && (
              <ColorSelector
                variants={product.variants}
                selectedColor={selectedColor}
                onColorSelect={setSelectedColor}
              />
            )}

            {/* Quantity */}
            <QuantitySelector
              value={quantity}
              onChange={setQuantity}
              min={1}
              max={selectedVariant?.stock || 10}
            />

            {/* Action buttons */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="default"
                size="lg"
                className="flex-1"
                disabled={!canAddToCart}
                leftIcon={<ShoppingBag className="h-5 w-5" />}
                onClick={() => {
                  if (product && selectedVariant) {
                    if (!isAuthenticated) {
                      saveDeferredAction({
                        type: "cart",
                        product,
                        variant: selectedVariant,
                        quantity,
                        returnUrl: `/product/${slug}`,
                      });
                      toast(t.productPage.loginToCart, { icon: "🛒" });
                      router.push("/auth/login");
                      return;
                    }
                    addItem(product, selectedVariant, quantity);
                  }
                }}
              >
                {canAddToCart ? t.catalog.addToCart : t.product.selectColor}
              </Button>

              <div className="flex gap-3 overflow-hidden">
                <Button
                  variant="outline"
                  size="lg"
                  className="min-w-0 flex-1 sm:flex-initial"
                  onClick={toggleFavorite}
                >
                  <Heart
                    className={cn("h-5 w-5 flex-shrink-0", isFavorite && "fill-primary-500 text-primary-500")}
                  />
                  <span className="ml-2 truncate sm:hidden">{t.nav.favorites}</span>
                </Button>

                <div className="relative min-w-0 flex-1 sm:flex-initial">
                  <Button variant="outline" size="lg" className="w-full" onClick={handleShare}>
                    <Share2 className="h-5 w-5 flex-shrink-0" />
                    <span className="ml-2 truncate sm:hidden">{t.productPage.share}</span>
                  </Button>
                  {shareMessage && (
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-charcoal px-2 py-1 text-xs text-white">
                      {shareMessage}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="grid grid-cols-3 gap-2 rounded-md border border-neutral-100 bg-white p-3 shadow-sm sm:gap-4 sm:p-4 dark:border-neutral-800 dark:bg-neutral-900">
              {[
                { icon: Truck, label: t.productPage.trust.freeDelivery },
                { icon: RotateCcw, label: t.productPage.trust.returns },
                { icon: Shield, label: t.productPage.trust.quality },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-1.5 text-center sm:gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-50 dark:bg-secondary-950/30 sm:h-10 sm:w-10">
                    <item.icon className="h-4 w-4 text-secondary-600 sm:h-5 sm:w-5" />
                  </div>
                  <span className="text-xs font-medium leading-tight text-neutral-700 dark:text-neutral-300">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Product tabs */}
        <div className="mt-16">
          <ProductTabs
            description={productDescription}
            specifications={specifications}
          />
        </div>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="mb-8 font-display text-2xl font-bold text-charcoal dark:text-white">
              {t.productPage.relatedProducts}
            </h2>
            <ProductGrid products={relatedProducts} />
          </div>
        )}
      </div>
    </div>
  );
}
