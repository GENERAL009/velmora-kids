"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

interface DeliverySettings {
  delivery_fee_courier?: number;
  free_delivery_from?: number;
  [key: string]: unknown;
}

/** Courier fee rules — the same numbers the backend uses to price the order. */
export function useDeliveryRules() {
  const { data } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => apiGet<DeliverySettings>("/settings/site"),
    staleTime: 5 * 60 * 1000,
  });
  const fee = Number(data?.delivery_fee_courier ?? 30000);
  const freeFrom = Number(data?.free_delivery_from ?? 500000);
  const courierFee = (subtotal: number) => (freeFrom > 0 && subtotal > freeFrom ? 0 : fee);
  return { fee, freeFrom, courierFee };
}
