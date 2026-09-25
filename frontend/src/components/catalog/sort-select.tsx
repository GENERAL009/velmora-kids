"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortOption = {
  value: string;
  label: string;
};

const sortOptions: SortOption[] = [
  { value: "newest", label: "Новинки" },
  { value: "popular", label: "Популярные" },
  { value: "price_asc", label: "Цена: от низкой" },
  { value: "price_desc", label: "Цена: от высокой" },
  { value: "rating", label: "По рейтингу" },
];

interface SortSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SortSelect({ value, onChange, className }: SortSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = sortOptions.find((opt) => opt.value === value) || sortOptions[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (option: SortOption) => {
    onChange(option.value);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 items-center gap-2 rounded-sm border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 transition-all dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
          "hover:border-primary-300 hover:bg-neutral-50 dark:hover:bg-neutral-700",
          isOpen && "border-primary-300 bg-neutral-50 ring-2 ring-primary-100 dark:bg-neutral-700"
        )}
      >
        <span>{selectedOption.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-neutral-500 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-md border border-neutral-200 bg-white shadow-card dark:border-neutral-700 dark:bg-neutral-800"
          >
            <div className="py-1">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors",
                    option.value === value
                      ? "bg-primary-50 text-primary-700 font-medium dark:bg-primary-950/30 dark:text-primary-400"
                      : "text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-700"
                  )}
                >
                  <span>{option.label}</span>
                  {option.value === value && (
                    <Check className="h-4 w-4 text-primary-600" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
