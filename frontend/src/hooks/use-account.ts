"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { User } from "@/types";

export interface AccountSummary {
  orders_count: number;
  active_orders_count: number;
  total_spent: number;
  favorites_count: number;
  addresses_count: number;
}

export interface SavedAddress {
  id: string;
  label: string;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
}

export type AddressInput = Omit<SavedAddress, "id" | "latitude" | "longitude"> & {
  latitude?: number | null;
  longitude?: number | null;
};

export function useAccountSummary() {
  return useQuery({
    queryKey: ["account", "summary"],
    queryFn: () => apiGet<AccountSummary>("/account/summary"),
    retry: 1,
  });
}

export function useAddresses(enabled = true) {
  return useQuery({
    queryKey: ["account", "addresses"],
    queryFn: () => apiGet<SavedAddress[]>("/account/addresses"),
    enabled,
    retry: 1,
  });
}

function useInvalidateAccount() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["account"] });
  };
}

export function useSaveAddress() {
  const invalidate = useInvalidateAccount();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<AddressInput> }) =>
      id
        ? apiPatch<SavedAddress>(`/account/addresses/${id}`, data)
        : apiPost<SavedAddress>("/account/addresses", data),
    onSuccess: invalidate,
  });
}

export function useDeleteAddress() {
  const invalidate = useInvalidateAccount();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/account/addresses/${id}`),
    onSuccess: invalidate,
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (data: { first_name?: string; last_name?: string; phone?: string | null }) =>
      apiPatch<User>("/auth/me", data),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      apiPost("/account/change-password", data),
  });
}

/** Extract FastAPI `detail` (string code or message) from an axios error */
export function apiErrorDetail(error: unknown): string | undefined {
  const err = error as { response?: { status?: number; data?: { detail?: unknown } } };
  const d = err?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (err?.response?.status === 429) return "rate_limited";
  return undefined;
}
