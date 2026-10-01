"use client";

import React, { useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCategories } from "@/hooks/use-products";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";
import { useLanguageStore } from "@/store/language";

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
  cat: { id: string; name: string; name_uz?: string; name_ru?: string; image?: string };
  gender: string;
  colorIdx: number;
}) {
  const locale = useLanguageStore((s) => s.locale);
  const name = (locale === "uz" ? cat.name_uz : cat.name_ru) || cat.name;
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
            alt={name}
            width={48}
            height={48}
            className="h-10 w-10 object-contain sm:h-11 sm:w-11"
            unoptimized
          />
        ) : (
          <span className="text-2xl sm:text-3xl">{name.slice(0, 1)}</span>
        )}
      </div>
      <span className="max-w-[76px] text-center text-[11px] font-medium leading-tight text-neutral-600 dark:text-neutral-400 sm:max-w-[88px] sm:text-xs line-clamp-2">
        {name}
      </span>
    </Link>
  );
}

export function CategoryStrip({ gender }: CategoryStripProps) {
  const t = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: categories = [] } = useCategories();
  const [desktopPage, setDesktopPage] = useState(0);

  const activeCategories = categories.filter((c) => c.is_active);

  const ITEMS_PER_PAGE = 6;
  const totalPages = Math.ceil(activeCategories.length / ITEMS_PER_PAGE);
  const currentPageItems = activeCategories.slice(
    desktopPage * ITEMS_PER_PAGE,
    (desktopPage + 1) * ITEMS_PER_PAGE
  );
  const topRow = currentPageItems.slice(0, 3);
  const bottomRow = currentPageItems.slice(3, 6);

  const goDesktop = useCallback(
    (dir: "prev" | "next") => {
      setDesktopPage((p) => {
        if (dir === "next") return p < totalPages - 1 ? p + 1 : 0;
        return p > 0 ? p - 1 : totalPages - 1;
      });
    },
    [totalPages]
  );

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir === "left" ? -200 : 200,
      behavior: "smooth",
    });
  };

  if (activeCategories.length === 0) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      {/* Desktop: 3x2 grid in a card with carousel */}
      <div className="hidden lg:block">
        <div className="relative rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
          {totalPages > 1 && (
            <>
              <button
                onClick={() => goDesktop("prev")}
                aria-label={t.catalogUi.strip.prev}
                className="absolute -left-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition-all hover:shadow-lg dark:bg-neutral-800"
              >
                <ChevronLeft className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
              </button>
              <button
                onClick={() => goDesktop("next")}
                aria-label={t.catalogUi.strip.next}
                className="absolute -right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition-all hover:shadow-lg dark:bg-neutral-800"
              >
                <ChevronRight className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
              </button>
            </>
          )}

          <div className="grid grid-cols-3 gap-y-5 gap-x-4 place-items-center">
            {topRow.map((cat, idx) => (
              <CategoryItem
                key={cat.id}
                cat={cat}
                gender={gender}
                colorIdx={desktopPage * ITEMS_PER_PAGE + idx}
              />
            ))}
          </div>
          {bottomRow.length > 0 && (
            <div className="mt-5 grid grid-cols-3 gap-y-5 gap-x-4 place-items-center">
              {bottomRow.map((cat, idx) => (
                <CategoryItem
                  key={cat.id}
                  cat={cat}
                  gender={gender}
                  colorIdx={desktopPage * ITEMS_PER_PAGE + 3 + idx}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-1.5">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setDesktopPage(i)}
                  aria-label={t.catalogUi.strip.page.replace("{page}", String(i + 1))}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === desktopPage
                      ? "w-5 bg-primary-500"
                      : "w-1.5 bg-neutral-300 dark:bg-neutral-600"
                  )}
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
          aria-label={t.catalogUi.strip.prev}
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
          aria-label={t.catalogUi.strip.next}
          className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition-all hover:shadow-lg dark:bg-neutral-800 sm:flex h-8 w-8"
        >
          <ChevronRight className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
        </button>
      </div>
    </div>
  );
}
