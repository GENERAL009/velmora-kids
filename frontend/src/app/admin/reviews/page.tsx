"use client";

import React, { useState } from "react";
import { Star, Check, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_approved: boolean;
  is_visible: boolean;
  created_at: string;
  user?: { id: string; first_name: string; last_name: string; email: string };
  product?: { id: string; name: string; slug: string };
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={cn("h-4 w-4", i < count ? "fill-amber-400 text-amber-400" : "text-neutral-300 dark:text-neutral-600")} />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin", "reviews", filter],
    queryFn: () => {
      const params = filter === "pending" ? "?is_approved=false" : filter === "approved" ? "?is_approved=true" : "";
      return apiGet<ReviewItem[]>(`/reviews${params}`);
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      apiPatch(`/reviews/${id}`, { is_approved: approved }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Sharhlar</h1>
        <p className="mt-1 text-sm text-neutral-500">{reviews.length} ta sharh</p>
      </div>

      <div className="flex gap-1">
        {(["all", "pending", "approved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn("rounded-lg px-3 py-2 text-xs font-medium transition-colors", filter === f ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300")}
          >
            {f === "all" ? "Barchasi" : f === "pending" ? "Kutilmoqda" : "Tasdiqlangan"}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
            <div className="h-4 w-48 rounded bg-neutral-200 dark:bg-neutral-700" />
          </div>
        ))}
        {reviews.map((review) => (
          <div key={review.id} className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <Stars count={review.rating} />
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", review.is_approved ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400")}>
                    {review.is_approved ? "Tasdiqlangan" : "Kutilmoqda"}
                  </span>
                </div>
                {review.product && (
                  <p className="mt-1 text-sm font-medium text-primary-600 dark:text-primary-400">{review.product.name}</p>
                )}
                {review.title && <p className="mt-1 font-medium text-neutral-900 dark:text-white">{review.title}</p>}
                {review.comment && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{review.comment}</p>}
                <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
                  {review.user && <span>{review.user.first_name} {review.user.last_name}</span>}
                  <span>{formatDate(review.created_at)}</span>
                </div>
              </div>
              <div className="flex gap-1">
                {!review.is_approved && (
                  <button
                    onClick={() => approveMutation.mutate({ id: review.id, approved: true })}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                    title="Tasdiqlash"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
                {review.is_approved && (
                  <button
                    onClick={() => approveMutation.mutate({ id: review.id, approved: false })}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                    title="Rad etish"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {!isLoading && reviews.length === 0 && (
          <div className="py-12 text-center text-neutral-500">Sharhlar topilmadi</div>
        )}
      </div>
    </div>
  );
}
