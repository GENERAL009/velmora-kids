"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem, Product, ProductVariant } from "@/types";

interface CartState {
  items: CartItem[];
  promoCode: string | null;
  discountPercent: number;
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  applyPromo: (code: string) => boolean;
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
      discountPercent: 0,

      addItem: (product: Product, variant: ProductVariant, quantity: number = 1) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) => item.variant.id === variant.id
          );

          if (existingIndex > -1) {
            const updatedItems = [...state.items];
            const maxQty = variant.stock_quantity ?? 99;
            const newQty = Math.min(updatedItems[existingIndex].quantity + quantity, maxQty);
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              quantity: newQty,
            };
            return { items: updatedItems };
          }

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
        const maxQty = item?.variant.stock_quantity ?? 99;
        const clampedQty = Math.min(quantity, maxQty);

        set((state) => ({
          items: state.items.map((item) =>
            item.variant.id === variantId ? { ...item, quantity: clampedQty } : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [], promoCode: null, discountPercent: 0 });
      },

      applyPromo: (code: string) => {
        if (code.trim().toLowerCase() === "welcome10") {
          set({ promoCode: code.trim(), discountPercent: 10 });
          return true;
        }
        return false;
      },

      clearPromo: () => {
        set({ promoCode: null, discountPercent: 0 });
      },

      getTotal: () => {
        return get().items.reduce((total, item) => {
          const price = item.variant.price_override ?? item.product.price;
          return total + price * item.quantity;
        }, 0);
      },

      getDiscount: () => {
        const subtotal = get().getTotal();
        return Math.round(subtotal * (get().discountPercent / 100));
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: "velmora-cart",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
