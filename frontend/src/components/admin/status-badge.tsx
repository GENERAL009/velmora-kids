import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Order statuses
  new: { label: "Новый", className: "bg-blue-100 text-blue-700 border-blue-200" },
  pending: { label: "Ожидание", className: "bg-blue-100 text-blue-700 border-blue-200" },
  confirmed: { label: "Подтверждён", className: "bg-amber-100 text-amber-700 border-amber-200" },
  processing: { label: "В обработке", className: "bg-amber-100 text-amber-700 border-amber-200" },
  packed: { label: "Собран", className: "bg-purple-100 text-purple-700 border-purple-200" },
  shipped: { label: "Отправлен", className: "bg-purple-100 text-purple-700 border-purple-200" },
  delivered: { label: "Доставлен", className: "bg-green-100 text-green-700 border-green-200" },
  completed: { label: "Завершён", className: "bg-green-100 text-green-700 border-green-200" },
  cancelled: { label: "Отменён", className: "bg-red-100 text-red-700 border-red-200" },
  failed: { label: "Не удался", className: "bg-red-100 text-red-700 border-red-200" },

  // Payment statuses
  paid: { label: "Оплачен", className: "bg-green-100 text-green-700 border-green-200" },
  unpaid: { label: "Не оплачен", className: "bg-gray-100 text-gray-700 border-gray-200" },
  refunded: { label: "Возврат", className: "bg-orange-100 text-orange-700 border-orange-200" },
  partial: { label: "Частично", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },

  // Product statuses
  active: { label: "Активен", className: "bg-green-100 text-green-700 border-green-200" },
  inactive: { label: "Неактивен", className: "bg-red-100 text-red-700 border-red-200" },
  draft: { label: "Черновик", className: "bg-gray-100 text-gray-700 border-gray-200" },

  // Stock statuses
  in_stock: { label: "В наличии", className: "bg-green-100 text-green-700 border-green-200" },
  low_stock: { label: "Мало", className: "bg-orange-100 text-orange-700 border-orange-200" },
  out_of_stock: { label: "Нет", className: "bg-red-100 text-red-700 border-red-200" },

  // CRM statuses
  lead: { label: "Лид", className: "bg-blue-100 text-blue-700 border-blue-200" },
  contacted: { label: "Связались", className: "bg-purple-100 text-purple-700 border-purple-200" },
  qualified: { label: "Квалифицирован", className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  converted: { label: "Конвертирован", className: "bg-green-100 text-green-700 border-green-200" },
  lost: { label: "Потерян", className: "bg-red-100 text-red-700 border-red-200" },

  // Priority levels
  urgent: { label: "Срочно", className: "bg-red-100 text-red-700 border-red-200" },
  high: { label: "Высокий", className: "bg-orange-100 text-orange-700 border-orange-200" },
  medium: { label: "Средний", className: "bg-blue-100 text-blue-700 border-blue-200" },
  low: { label: "Низкий", className: "bg-gray-100 text-gray-700 border-gray-200" },
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
