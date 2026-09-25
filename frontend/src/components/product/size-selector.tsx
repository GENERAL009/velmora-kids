"use client";

import React from "react";
import { motion } from "framer-motion";
import { Ruler } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductVariant, Size } from "@/types";

interface SizeSelectorProps {
  variants: ProductVariant[];
  selectedSize: string | null;
  onSizeSelect: (sizeId: string) => void;
  onSizeGuideClick?: () => void;
  className?: string;
}

export function SizeSelector({
  variants,
  selectedSize,
  onSizeSelect,
  onSizeGuideClick,
  className,
}: SizeSelectorProps) {
  // Get unique sizes with their availability
  const sizeAvailability = variants.reduce((acc, variant) => {
    const sizeId = variant.size_id;
    const isAvailable = variant.is_active && variant.stock_quantity > 0;

    if (!acc[sizeId]) {
      acc[sizeId] = {
        size: variant.size,
        available: isAvailable,
        stock: variant.stock_quantity,
      };
    } else {
      acc[sizeId].available = acc[sizeId].available || isAvailable;
      acc[sizeId].stock += variant.stock_quantity;
    }

    return acc;
  }, {} as Record<string, { size: Size; available: boolean; stock: number }>);

  const sizes = Object.entries(sizeAvailability)
    .map(([sizeId, data]) => ({
      id: sizeId,
      ...data,
    }))
    .sort((a, b) => a.size.sort_order - b.size.sort_order);

  if (sizes.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-charcoal dark:text-white">
          Размер
          {selectedSize && (
            <span className="ml-2 font-normal text-neutral-500">
              ({sizes.find((s) => s.id === selectedSize)?.size.name})
            </span>
          )}
        </h3>
        {onSizeGuideClick && (
          <button
            onClick={onSizeGuideClick}
            className="flex items-center gap-1.5 text-xs text-primary-600 transition-colors hover:text-primary-700 hover:underline"
          >
            <Ruler className="h-3.5 w-3.5" />
            Таблица размеров
          </button>
        )}
      </div>

      {/* Size grid */}
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-6">
        {sizes.map((sizeOption) => {
          const isSelected = selectedSize === sizeOption.id;
          const isAvailable = sizeOption.available;
          const isLowStock = sizeOption.stock > 0 && sizeOption.stock <= 3;

          return (
            <motion.button
              key={sizeOption.id}
              onClick={() => isAvailable && onSizeSelect(sizeOption.id)}
              disabled={!isAvailable}
              whileHover={isAvailable ? { scale: 1.05 } : {}}
              whileTap={isAvailable ? { scale: 0.95 } : {}}
              className={cn(
                "relative flex h-11 items-center justify-center rounded-sm border-2 text-sm font-medium transition-all",
                isSelected && isAvailable
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400 shadow-sm"
                  : isAvailable
                  ? "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-950/20"
                  : "cursor-not-allowed border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-300 dark:text-neutral-600 line-through"
              )}
              title={
                !isAvailable
                  ? "Нет в наличии"
                  : isLowStock
                  ? `Осталось: ${sizeOption.stock} шт.`
                  : undefined
              }
            >
              {sizeOption.size.name}

              {/* Low stock indicator */}
              {isAvailable && isLowStock && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-500 text-[9px] font-bold text-white">
                  !
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Selected size info */}
      {selectedSize && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-neutral-500"
        >
          {(() => {
            const selected = sizes.find((s) => s.id === selectedSize);
            if (!selected) return null;

            if (selected.stock <= 3) {
              return (
                <span className="text-accent-600">
                  Внимание: осталось всего {selected.stock} шт.
                </span>
              );
            }

            return <span className="text-secondary-600">В наличии</span>;
          })()}
        </motion.p>
      )}
    </div>
  );
}
