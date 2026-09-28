"use client";

import React, { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCategories } from "@/hooks/use-products";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS = [
  "from-pink-100 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/10",
  "from-blue-100 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/10",
  "from-emerald-100 to-green-50 dark:from-emerald-900/20 dark:to-green-900/10",
  "from-amber-100 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/10",
  "from-purple-100 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/10",
  "from-red-100 to-orange-50 dark:from-red-900/20 dark:to-orange-900/10",
  "from-teal-100 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/10",
  "from-indigo-100 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/10",
];

interface CategoryStripProps {
  gender: "girls" | "boys";
}

export function CategoryStrip({ gender }: CategoryStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: categories = [] } = useCategories();

  const activeCategories = categories.filter((c) => c.is_active);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.offsetWidth * 0.6;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  if (activeCategories.length === 0) return null;

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute -left-2 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition-all hover:shadow-lg dark:bg-neutral-800 sm:flex h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
        </button>

        <div
          ref={scrollRef}
          className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth sm:gap-4"
        >
          {activeCategories.map((cat, idx) => (
            <Link
              key={cat.id}
              href={`/catalog?category_id=${cat.id}&gender=${gender}`}
              className="flex flex-shrink-0 flex-col items-center gap-2"
            >
              <div
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br transition-transform hover:scale-105 sm:h-20 sm:w-20",
                  CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
                )}
              >
                {cat.image ? (
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    width={48}
                    height={48}
                    className="h-10 w-10 object-contain sm:h-12 sm:w-12"
                    unoptimized
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl">
                    {cat.name.slice(0, 1)}
                  </span>
                )}
              </div>
              <span className="max-w-[80px] text-center text-[11px] font-medium leading-tight text-neutral-600 dark:text-neutral-400 sm:max-w-[96px] sm:text-xs line-clamp-2">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>

        <button
          onClick={() => scroll("right")}
          className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition-all hover:shadow-lg dark:bg-neutral-800 sm:flex h-8 w-8"
        >
          <ChevronRight className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
        </button>
      </div>
    </div>
  );
}
