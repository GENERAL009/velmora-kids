"use client";

import React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 999,
  className,
}: QuantitySelectorProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || min;
    const clampedValue = Math.max(min, Math.min(max, newValue));
    onChange(clampedValue);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-semibold text-charcoal dark:text-white">Количество</label>
      <div className="flex items-center">
        {/* Decrement button */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-l-sm border-2 border-r-0 transition-all",
            value <= min
              ? "cursor-not-allowed border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-300 dark:text-neutral-600"
              : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-950/20 hover:text-primary-600 active:scale-95"
          )}
          aria-label="Уменьшить количество"
        >
          <Minus className="h-4 w-4" />
        </button>

        {/* Input */}
        <input
          type="number"
          value={value}
          onChange={handleInputChange}
          min={min}
          max={max}
          className="h-11 w-16 border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-center text-sm font-medium text-charcoal dark:text-white focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
          aria-label="Количество"
        />

        {/* Increment button */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-r-sm border-2 border-l-0 transition-all",
            value >= max
              ? "cursor-not-allowed border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-300 dark:text-neutral-600"
              : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-950/20 hover:text-primary-600 active:scale-95"
          )}
          aria-label="Увеличить количество"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Stock indicator */}
      {max < 999 && (
        <p className="text-xs text-neutral-500">
          {max <= 5 ? (
            <span className="text-accent-600">
              Осталось всего {max} шт.
            </span>
          ) : (
            <span>Максимум: {max} шт.</span>
          )}
        </p>
      )}
    </div>
  );
}
