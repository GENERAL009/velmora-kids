"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { formatPrice } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";

function pluralize(n: number, one: string, few: string, many: string) {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (lastDigit > 1 && lastDigit < 5) return few;
  if (lastDigit === 1) return one;
  return many;
}

export default function CartPage() {
  const router = useRouter();
  const t = useTranslation();
  const { items, updateQuantity, removeItem, getTotal, getDiscount, getItemCount, promoCode: storePromo, applyPromo, clearPromo } = useCartStore();
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");

  const subtotal = getTotal();
  const discount = getDiscount();
  const deliveryFee = subtotal > 500000 ? 0 : 30000;
  const total = subtotal - discount + deliveryFee;

  const handleApplyPromo = () => {
    setPromoError("");
    if (applyPromo(promoInput)) {
      setPromoInput("");
    } else if (promoInput.trim()) {
      setPromoError(t.cart.promoInvalid);
    }
  };

  const handleCheckout = () => {
    if (items.length > 0) {
      router.push("/checkout");
    }
  };

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-cream pb-12 pt-24 dark:bg-neutral-950 lg:pb-20 lg:pt-28">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-md text-center">
              <div className="mb-6 flex justify-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200">
                  <ShoppingBag className="h-12 w-12 text-primary-600" />
                </div>
              </div>
              <h1 className="mb-3 font-display text-2xl text-charcoal dark:text-white sm:text-3xl">
                {t.cart.empty}
              </h1>
              <p className="mb-8 text-neutral-600 dark:text-neutral-400">
                {t.cart.emptyDescription}
              </p>
              <Link href="/catalog">
                <Button size="lg" className="group">
                  {t.cart.goToCatalog}
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream pb-8 pt-24 dark:bg-neutral-950 lg:pb-12 lg:pt-28">
        <div className="container mx-auto px-4">
          <div className="mb-6 sm:mb-8">
            <h1 className="font-display text-2xl text-charcoal dark:text-white sm:text-3xl lg:text-4xl">
              {t.cart.title}
            </h1>
            <p className="mt-1 text-sm text-neutral-500 sm:text-base">
              {getItemCount()} {pluralize(getItemCount(), t.cart.item_one, t.cart.item_few, t.cart.item_many)}
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {items.map((item) => {
                  const price = item.product.price + (item.variant.additional_price ?? 0);
                  const itemTotal = price * item.quantity;

                  return (
                    <div
                      key={item.variant.id}
                      className="group rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-primary-100 to-secondary-100 lg:h-32 lg:w-32">
                          {item.product.images?.[0]?.file_path ? (
                            <Image
                              src={item.product.images[0].file_path}
                              alt={item.product.name}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <ShoppingBag className="h-8 w-8 text-primary-300" />
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex flex-1 flex-col justify-between">
                          <div>
                            <div className="mb-1 flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-medium text-charcoal dark:text-white lg:text-lg">
                                  {item.product.name}
                                </h3>
                                {item.product.brand && (
                                  <p className="text-sm text-neutral-500">
                                    {item.product.brand.name}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => removeItem(item.variant.id)}
                                className="flex-shrink-0 rounded-full p-2 text-neutral-400 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500"
                                aria-label="Удалить товар"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>

                            <div className="mb-2 flex flex-wrap gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                              <span className="rounded bg-neutral-100 dark:bg-neutral-800 px-2 py-1">
                                <span className="mr-1">{t.cart.color}:</span>
                                <span
                                  className="inline-block h-3 w-3 rounded-full border border-neutral-300"
                                  style={{ backgroundColor: item.variant.color.hex_code }}
                                />
                                <span className="ml-1">{item.variant.color.name}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(item.variant.id, item.quantity - 1)}
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-600 transition-colors hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/30"
                                aria-label="Уменьшить количество"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-8 text-center font-medium dark:text-neutral-200">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-600 transition-colors hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/30"
                                aria-label="Увеличить количество"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Price */}
                            <div className="text-right">
                              <p className="text-sm text-neutral-500">
                                {formatPrice(price)} × {item.quantity}
                              </p>
                              <p className="font-semibold text-charcoal dark:text-white lg:text-lg">
                                {formatPrice(itemTotal)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 p-6 shadow-sm">
                <h2 className="mb-4 font-display text-xl text-charcoal dark:text-white">
                  {t.cart.summary}
                </h2>

                <div className="space-y-3 border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600 dark:text-neutral-400">{t.cart.subtotal}</span>
                    <span className="font-medium dark:text-neutral-200">{formatPrice(subtotal)}</span>
                  </div>

                  {storePromo && (
                    <div className="flex justify-between text-sm text-secondary-600">
                      <span>{t.cart.discount} ({storePromo})</span>
                      <span className="font-medium">-{formatPrice(discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600 dark:text-neutral-400">{t.cart.delivery}</span>
                    <span className="font-medium dark:text-neutral-200">
                      {deliveryFee === 0 ? (
                        <span className="text-secondary-600">{t.cart.free}</span>
                      ) : (
                        formatPrice(deliveryFee)
                      )}
                    </span>
                  </div>
                </div>

                <div className="py-4">
                  <div className="flex justify-between">
                    <span className="font-display text-lg text-charcoal dark:text-white">{t.cart.total}</span>
                    <span className="font-display text-2xl font-semibold text-charcoal dark:text-white">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="mb-4 w-full"
                  onClick={handleCheckout}
                >
                  {t.cart.checkout}
                </Button>

                {/* Promo Code */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {t.cart.promoCode}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t.cart.promoPlaceholder}
                      value={promoInput}
                      onChange={(e) => { setPromoInput(e.target.value); setPromoError(""); }}
                      disabled={!!storePromo}
                      inputSize="sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleApplyPromo}
                      disabled={!!storePromo}
                    >
                      {t.cart.apply}
                    </Button>
                  </div>
                  {storePromo && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-secondary-600">{t.cart.promoApplied}</p>
                      <button onClick={clearPromo} className="text-xs text-red-500 hover:underline">{t.cart.promoRemove}</button>
                    </div>
                  )}
                  {promoError && (
                    <p className="text-xs text-red-500">{promoError}</p>
                  )}
                </div>

                {subtotal < 500000 && (
                  <div className="mt-4 rounded-md bg-accent-50 dark:bg-accent-950/30 p-3 text-xs text-accent-700 dark:text-accent-400">
                    {t.cart.freeDeliveryHint.replace("{amount}", formatPrice(500000 - subtotal))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
