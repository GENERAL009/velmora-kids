"use client";

export const dynamic = "force-dynamic";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";

function formatPrice(value: number): string {
  return value.toLocaleString("uz-UZ").replace(/,/g, " ") + " so'm";
}

interface StockVariant {
  id: string;
  sku: string;
  stock: number;
  is_active: boolean;
  additional_price: number;
  product?: { id: string; name: string; sku: string; selling_price: number; discount_price?: number | null };
  color?: { id: string; name: string; hex_code: string };
}

function getVariantPrice(v: StockVariant): number {
  const base = v.product?.discount_price ?? v.product?.selling_price ?? 0;
  return base + (v.additional_price || 0);
}

interface CartItem {
  variant: StockVariant;
  quantity: number;
  unitPrice: number;
}

interface POSSaleResponse {
  order_id: string;
  order_number: string;
  total: number;
  items_count: number;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Naqd" },
  { value: "card_transfer", label: "Karta" },
  { value: "payme", label: "Payme" },
  { value: "click", label: "Click" },
];

export default function POSPage() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StockVariant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [lastSale, setLastSale] = useState<POSSaleResponse | null>(null);
  const [error, setError] = useState("");

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const data = await apiGet<{ items: StockVariant[] }>(`/inventory?search=${encodeURIComponent(q)}&page_size=20`);
      setSearchResults((data.items || []).filter((v) => v.stock > 0 && v.is_active));
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSearch(searchQuery), 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery, doSearch]);

  const addToCart = (variant: StockVariant) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.variant.id === variant.id);
      if (existing) {
        if (existing.quantity >= variant.stock) return prev;
        return prev.map((c) =>
          c.variant.id === variant.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { variant, quantity: 1, unitPrice: getVariantPrice(variant) }];
    });
    setError("");
  };

  const updateQuantity = (variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.variant.id !== variantId) return c;
          const newQty = c.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > c.variant.stock) return c;
          return { ...c, quantity: newQty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (variantId: string) => {
    setCart((prev) => prev.filter((c) => c.variant.id !== variantId));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0);

  const saleMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiPost<POSSaleResponse>("/inventory/pos-sale", data),
    onSuccess: (data) => {
      setLastSale(data);
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setNote("");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      setSearchResults([]);
      setSearchQuery("");
      searchInputRef.current?.focus();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail || "Sotuvni rasmiylashtrishda xatolik");
    },
  });

  const handleCheckout = () => {
    if (cart.length === 0) {
      setError("Savatga tovar qo'shing");
      return;
    }
    saleMutation.mutate({
      items: cart.map((c) => ({ variant_id: c.variant.id, quantity: c.quantity })),
      customer_name: customerName || undefined,
      customer_phone: customerPhone || undefined,
      payment_method: paymentMethod,
      note: note || undefined,
    });
  };

  const inputCls =
    "w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Kassa</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">
          Offlayn sotuv — tovar qidirish, chekka qo'shish, rasmiylashtirish
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Search + Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Nomi yoki SKU bo'yicha qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white shadow-sm"
            />
          </div>

          {/* Search Results */}
          {isSearching && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 py-4 text-center">
              Qidirilmoqda...
            </p>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {searchResults.map((variant) => {
                const inCart = cart.find((c) => c.variant.id === variant.id);
                return (
                  <button
                    key={variant.id}
                    onClick={() => addToCart(variant)}
                    disabled={!!inCart && inCart.quantity >= variant.stock}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border text-left transition-all",
                      "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700",
                      "hover:border-primary-400 hover:shadow-md",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {variant.color && (
                      <div
                        className="w-8 h-8 rounded-full border-2 border-neutral-200 dark:border-neutral-600 flex-shrink-0"
                        style={{ backgroundColor: variant.color.hex_code }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900 dark:text-white truncate">
                        {variant.product?.name ?? "—"}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {variant.color?.name} · {variant.sku}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {formatPrice(getVariantPrice(variant))}
                      </p>
                      <p
                        className={cn(
                          "text-xs font-medium",
                          variant.stock <= 3
                            ? "text-red-500"
                            : "text-green-600 dark:text-green-400"
                        )}
                      >
                        Mavjud: {variant.stock}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!isSearching && searchQuery && searchResults.length === 0 && (
            <div className="text-center py-10 text-neutral-500 dark:text-neutral-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Hech narsa topilmadi</p>
            </div>
          )}

          {!searchQuery && (
            <div className="text-center py-16 text-neutral-400 dark:text-neutral-500">
              <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">Qidirish uchun tovar nomi yoki SKU kiriting</p>
            </div>
          )}
        </div>

        {/* RIGHT: Cart / Checkout */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Chek
                {cart.length > 0 && (
                  <span className="ml-auto text-sm font-normal text-neutral-500">
                    {cart.length} poz.
                  </span>
                )}
              </h2>
            </div>

            {cart.length === 0 ? (
              <div className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-500 text-sm">
                Savat bo'sh
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-700 max-h-[40vh] overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.variant.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                          {item.variant.product?.name}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {item.variant.color?.name} · {formatPrice(item.unitPrice)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.variant.id)}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.variant.id, -1)}
                          className="w-7 h-7 flex items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-neutral-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.variant.id, 1)}
                          disabled={item.quantity >= item.variant.stock}
                          className="w-7 h-7 flex items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600 disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            {cart.length > 0 && (
              <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-neutral-900 dark:text-white">
                    Jami
                  </span>
                  <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                    {formatPrice(cartTotal)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Customer + Payment */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                Xaridor ismi
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ixtiyoriy"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                Telefon
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+998..."
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                To'lov usuli
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm.value}
                    onClick={() => setPaymentMethod(pm.value)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium border transition-all",
                      paymentMethod === pm.value
                        ? "bg-primary-500 text-white border-primary-500"
                        : "bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-primary-400"
                    )}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                Izoh
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Ixtiyoriy"
                className={inputCls + " resize-none"}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <Button
            variant="default"
            size="lg"
            className="w-full"
            leftIcon={<ShoppingCart className="w-5 h-5" />}
            onClick={handleCheckout}
            isLoading={saleMutation.isPending}
            disabled={cart.length === 0}
          >
            Sotuvni rasmiylashtirish — {formatPrice(cartTotal)}
          </Button>

          {/* Last sale receipt */}
          {lastSale && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="font-bold text-green-800 dark:text-green-300">
                  Sotuv rasmiylashtirildi
                </span>
              </div>
              <div className="text-sm text-green-700 dark:text-green-400 space-y-1">
                <p>
                  Chek: <span className="font-mono font-semibold">{lastSale.order_number}</span>
                </p>
                <p>
                  Summa: <span className="font-semibold">{formatPrice(lastSale.total)}</span>
                </p>
                <p>Pozitsiyalar: {lastSale.items_count}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
