"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import toast from "react-hot-toast";
import { apiPost } from "@/lib/api";
import type { CartItem, Product, ProductVariant } from "@/types";

/** Coupon as validated by the backend (/promotions/validate-coupon) */
export interface AppliedPromo {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  applies_to: "all" | "product" | "category";
  product_id: string | null;
  category_id: string | null;
}

interface CartState {
  items: CartItem[];
  promoCode: string | null;
  promo: AppliedPromo | null;
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  applyPromo: (code: string) => Promise<{ ok: boolean; message?: string }>;
  clearPromo: () => void;
  getTotal: () => number;
  getDiscount: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      promoCode: null,
      promo: null,

      addItem: (product: Product, variant: ProductVariant, quantity: number = 1) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) => item.variant.id === variant.id
          );

          if (existingIndex > -1) {
            const updatedItems = [...state.items];
            const maxQty = variant.stock ?? 99;
            const newQty = Math.min(updatedItems[existingIndex].quantity + quantity, maxQty);
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              quantity: newQty,
            };
            toast.success(`${product.name} — количество обновлено`);
            return { items: updatedItems };
          }

          toast.success(`${product.name} добавлен в корзину`);
          return {
            items: [...state.items, { product, variant, quantity }],
          };
        });
      },

      removeItem: (variantId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.variant.id !== variantId),
        }));
      },

      updateQuantity: (variantId: string, quantity: number) => {
        if (quantity < 1) {
          get().removeItem(variantId);
          return;
        }
        const item = get().items.find((i) => i.variant.id === variantId);
        const maxQty = item?.variant.stock ?? 99;
        const clampedQty = Math.min(quantity, maxQty);

        set((state) => ({
          items: state.items.map((item) =>
            item.variant.id === variantId ? { ...item, quantity: clampedQty } : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [], promoCode: null, promo: null });
      },

      applyPromo: async (code: string) => {
        const trimmed = code.trim();
        if (!trimmed) return { ok: false };
        try {
          const p = await apiPost<{
            code: string;
            discount_type: "percentage" | "fixed";
            discount_value: number | string;
            min_order_amount: number | string | null;
            max_discount_amount: number | string | null;
            applies_to: "all" | "product" | "category";
            product_id: string | null;
            category_id: string | null;
          }>("/promotions/validate-coupon", { code: trimmed });
          const promo: AppliedPromo = {
            code: p.code || trimmed,
            discount_type: p.discount_type,
            discount_value: Number(p.discount_value) || 0,
            min_order_amount: p.min_order_amount != null ? Number(p.min_order_amount) : null,
            max_discount_amount: p.max_discount_amount != null ? Number(p.max_discount_amount) : null,
            applies_to: p.applies_to,
            product_id: p.product_id,
            category_id: p.category_id,
          };
          set({ promoCode: promo.code, promo });
          return { ok: true };
        } catch (error) {
          const err = error as { response?: { data?: { detail?: string } } };
          return { ok: false, message: err.response?.data?.detail };
        }
      },

      clearPromo: () => {
        set({ promoCode: null, promo: null });
      },

      getTotal: () => {
        return get().items.reduce((total, item) => {
          const price = item.product.price + (item.variant.additional_price ?? 0);
          return total + price * item.quantity;
        }, 0);
      },

      // Mirrors backend promotion_service.calculate_discount (the server total is authoritative)
      getDiscount: () => {
        const { promo, items } = get();
        if (!promo) return 0;
        const lineTotal = (item: CartItem) =>
          (item.product.price + (item.variant.additional_price ?? 0)) * item.quantity;
        const orderTotal = items.reduce((sum, item) => sum + lineTotal(item), 0);
        if (promo.min_order_amount != null && orderTotal < promo.min_order_amount) return 0;
        const base = items
          .filter((item) =>
            promo.applies_to === "product"
              ? item.product.id === promo.product_id
              : promo.applies_to === "category"
                ? item.product.category_id === promo.category_id
                : true
          )
          .reduce((sum, item) => sum + lineTotal(item), 0);
        if (base <= 0) return 0;
        let discount =
          promo.discount_type === "percentage" ? (base * promo.discount_value) / 100 : promo.discount_value;
        if (promo.max_discount_amount != null) discount = Math.min(discount, promo.max_discount_amount);
        return Math.round(Math.max(0, Math.min(discount, base)));
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: "velmora-cart",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted: unknown, version: number) => {
        if (version < 2) {
          return { items: [], promoCode: null, promo: null };
        }
        if (version < 3) {
          // old client-side "WELCOME10" coupon is no longer valid
          const old = persisted as { items?: CartItem[] };
          return { items: old.items ?? [], promoCode: null, promo: null };
        }
        return persisted as CartState;
      },
    }
  )
);
