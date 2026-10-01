import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const statusConfig: Record<string, { label: string; className: string }> = {
  // Order statuses
  new: { label: "Yangi", className: "bg-blue-100 text-blue-700 border-blue-200" },
  pending: { label: "Kutilmoqda", className: "bg-blue-100 text-blue-700 border-blue-200" },
  confirmed: { label: "Tasdiqlangan", className: "bg-amber-100 text-amber-700 border-amber-200" },
  processing: { label: "Jarayonda", className: "bg-amber-100 text-amber-700 border-amber-200" },
  packed: { label: "Yig'ilgan", className: "bg-purple-100 text-purple-700 border-purple-200" },
  packing: { label: "Yig'ilmoqda", className: "bg-purple-100 text-purple-700 border-purple-200" },
  ready: { label: "Tayyor", className: "bg-teal-100 text-teal-700 border-teal-200" },
  returned: { label: "Qaytarilgan", className: "bg-orange-100 text-orange-700 border-orange-200" },
  suspicious: { label: "Shubhali", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  shipped: { label: "Jo'natilgan", className: "bg-purple-100 text-purple-700 border-purple-200" },
  delivered: { label: "Yetkazilgan", className: "bg-green-100 text-green-700 border-green-200" },
  completed: { label: "Yakunlangan", className: "bg-green-100 text-green-700 border-green-200" },
  cancelled: { label: "Bekor qilingan", className: "bg-red-100 text-red-700 border-red-200" },
  failed: { label: "Muvaffaqiyatsiz", className: "bg-red-100 text-red-700 border-red-200" },

  // Payment statuses
  paid: { label: "To'langan", className: "bg-green-100 text-green-700 border-green-200" },
  unpaid: { label: "To'lanmagan", className: "bg-gray-100 text-gray-700 border-gray-200" },
  refunded: { label: "Qaytarilgan", className: "bg-orange-100 text-orange-700 border-orange-200" },
  partial: { label: "Qisman", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },

  // Product statuses
  active: { label: "Faol", className: "bg-green-100 text-green-700 border-green-200" },
  inactive: { label: "Nofaol", className: "bg-red-100 text-red-700 border-red-200" },
  draft: { label: "Qoralama", className: "bg-gray-100 text-gray-700 border-gray-200" },

  // Stock statuses
  in_stock: { label: "Mavjud", className: "bg-green-100 text-green-700 border-green-200" },
  low_stock: { label: "Kam", className: "bg-orange-100 text-orange-700 border-orange-200" },
  out_of_stock: { label: "Yo'q", className: "bg-red-100 text-red-700 border-red-200" },

  // CRM statuses
  lead: { label: "Lid", className: "bg-blue-100 text-blue-700 border-blue-200" },
  contacted: { label: "Bog'lanildi", className: "bg-purple-100 text-purple-700 border-purple-200" },
  qualified: { label: "Malakali", className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  converted: { label: "Konvertatsiya", className: "bg-green-100 text-green-700 border-green-200" },
  lost: { label: "Yo'qotilgan", className: "bg-red-100 text-red-700 border-red-200" },

  // Priority levels
  urgent: { label: "Shoshilinch", className: "bg-red-100 text-red-700 border-red-200" },
  high: { label: "Yuqori", className: "bg-orange-100 text-orange-700 border-orange-200" },
  medium: { label: "O'rta", className: "bg-blue-100 text-blue-700 border-blue-200" },
  low: { label: "Past", className: "bg-gray-100 text-gray-700 border-gray-200" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status.toLowerCase()] || {
    label: status,
    className: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
