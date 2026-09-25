"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductVariant, Color } from "@/types";

interface ColorSelectorProps {
  variants: ProductVariant[];
  selectedColor: string | null;
  onColorSelect: (colorId: string) => void;
  className?: string;
}

export function ColorSelector({
  variants,
  selectedColor,
  onColorSelect,
  className,
}: ColorSelectorProps) {
  // Get unique colors with their availability
  const colorAvailability = variants.reduce((acc, variant) => {
    const colorId = variant.color_id;
    const isAvailable = variant.is_active && variant.stock_quantity > 0;

    if (!acc[colorId]) {
      acc[colorId] = {
        color: variant.color,
        available: isAvailable,
      };
    } else {
      acc[colorId].available = acc[colorId].available || isAvailable;
    }

    return acc;
  }, {} as Record<string, { color: Color; available: boolean }>);

  const colors = Object.entries(colorAvailability).map(([colorId, data]) => ({
    id: colorId,
    ...data,
  }));

  if (colors.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <h3 className="text-sm font-semibold text-charcoal dark:text-white">
        Цвет
        {selectedColor && (
          <span className="ml-2 font-normal text-neutral-500">
            ({colors.find((c) => c.id === selectedColor)?.color.name})
          </span>
        )}
      </h3>

      {/* Color swatches */}
      <div className="flex flex-wrap gap-3">
        {colors.map((colorOption) => {
          const isSelected = selectedColor === colorOption.id;
          const isAvailable = colorOption.available;

          return (
            <motion.button
              key={colorOption.id}
              onClick={() => isAvailable && onColorSelect(colorOption.id)}
              disabled={!isAvailable}
              whileHover={isAvailable ? { scale: 1.1 } : {}}
              whileTap={isAvailable ? { scale: 0.9 } : {}}
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                isSelected && isAvailable
                  ? "border-primary-500 shadow-md ring-2 ring-primary-200"
                  : isAvailable
                  ? "border-neutral-200 hover:border-primary-300"
                  : "cursor-not-allowed border-neutral-200 opacity-40"
              )}
              style={{
                backgroundColor: isAvailable ? colorOption.color.hex_code : "#f5f5f5",
              }}
              title={colorOption.color.name}
              aria-label={`Выбрать цвет ${colorOption.color.name}`}
            >
              {/* Checkmark for selected color */}
              {isSelected && isAvailable && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm"
                >
                  <Check className="h-3.5 w-3.5 text-primary-600" />
                </motion.div>
              )}

              {/* Diagonal line for unavailable colors */}
              {!isAvailable && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-px w-full rotate-45 bg-neutral-400" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Color name display */}
      {selectedColor && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-neutral-600 dark:text-neutral-400"
        >
          Выбран:{" "}
          <span className="font-medium text-charcoal dark:text-white">
            {colors.find((c) => c.id === selectedColor)?.color.name}
          </span>
        </motion.p>
      )}
    </div>
  );
}
