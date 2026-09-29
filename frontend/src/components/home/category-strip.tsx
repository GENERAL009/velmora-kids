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

function CategoryItem({
  cat,
  gender,
  colorIdx,
}: {
  cat: { id: string; name: string; image?: string };
  gender: string;
  colorIdx: number;
}) {
  return (
    <Link
      href={`/catalog?category_id=${cat.id}&gender=${gender}`}
      className="flex flex-col items-center gap-2"
    >
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br transition-transform hover:scale-105 sm:h-[72px] sm:w-[72px]",
          CATEGORY_COLORS[colorIdx % CATEGORY_COLORS.length]
        )}
      >
        {cat.image ? (
          <Image
            src={cat.image}
            alt={cat.name}
            width={48}
            height={48}
            className="h-10 w-10 object-contain sm:h-11 sm:w-11"
            unoptimized
          />
        ) : (
          <span className="text-2xl sm:text-3xl">{cat.name.slice(0, 1)}</span>
        )}
      </div>
      <span className="max-w-[76px] text-center text-[11px] font-medium leading-tight text-neutral-600 dark:text-neutral-400 sm:max-w-[88px] sm:text-xs line-clamp-2">
        {cat.name}
      </span>
    </Link>
  );
}

export function CategoryStrip({ gender }: CategoryStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: categories = [] } = useCategories();

  const activeCategories = categories.filter((c) => c.is_active);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.offsetWidth * 0.6;
    el.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (activeCategories.length === 0) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      {/* Desktop: 3x2 grid in a card */}
      <div className="hidden lg:block">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="grid grid-cols-6 gap-y-5 gap-x-4 place-items-center">
            {activeCategories.slice(0, 6).map((cat, idx) => (
              <CategoryItem
                key={cat.id}
                cat={cat}
                gender={gender}
                colorIdx={idx}
              />
            ))}
          </div>
          {activeCategories.length > 6 && (
            <div className="mt-4 flex gap-4 overflow-x-auto pt-4 border-t border-neutral-100 dark:border-neutral-800 no-scrollbar justify-center">
              {activeCategories.slice(6).map((cat, idx) => (
                <CategoryItem
                  key={cat.id}
                  cat={cat}
                  gender={gender}
                  colorIdx={idx + 6}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile/Tablet: horizontal scroll */}
      <div className="relative lg:hidden">
        <button
          onClick={() => scroll("left")}
          className="absolute -left-2 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition-all hover:shadow-lg dark:bg-neutral-800 sm:flex h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
        </button>

        <div
          ref={scrollRef}
          className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth"
        >
          {activeCategories.map((cat, idx) => (
            <div key={cat.id} className="flex-shrink-0">
              <CategoryItem cat={cat} gender={gender} colorIdx={idx} />
            </div>
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
