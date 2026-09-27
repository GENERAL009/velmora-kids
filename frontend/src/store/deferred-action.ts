"use client";

import type { Product, ProductVariant } from "@/types";

export interface DeferredFavorite {
  type: "favorite";
  productId: string;
  returnUrl: string;
}

export interface DeferredCart {
  type: "cart";
  product: Product;
  variant: ProductVariant;
  quantity: number;
  returnUrl: string;
}

export type DeferredAction = DeferredFavorite | DeferredCart;

const KEY = "velmora-deferred-action";

export function saveDeferredAction(action: DeferredAction) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(action));
  } catch {}
}

export function getDeferredAction(): DeferredAction | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearDeferredAction() {
  sessionStorage.removeItem(KEY);
}
