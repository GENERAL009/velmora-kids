"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Clock, TrendingUp } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  price: number;
  image?: string;
  category?: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "Самокат трёхколёсный",
    "Электромобиль",
    "Коляска прогулочная",
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

  const trendingSearches = [
    "Самокаты",
    "Электрокары",
    "Беговелы",
    "Квадроциклы",
  ];

  const dummyResults: SearchResult[] = [
    {
      id: "1",
      name: "Самокат трёхколёсный со светящимися колёсами",
      slug: "samokat-tryokhkolyosnyy",
      price: 450000,
      category: "Самокаты",
    },
    {
      id: "2",
      name: "Электромобиль Mercedes-Benz для детей",
      slug: "elektromobil-mercedes",
      price: 3500000,
      category: "Электромобили",
    },
    {
      id: "3",
      name: "Беговел алюминиевый 12 дюймов",
      slug: "begovel-alyuminievyy",
      price: 650000,
      category: "Велосипеды",
    },
  ];

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (query.trim().length > 2) {
      // Simulate API search
      const filtered = dummyResults.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
    } else {
      setResults([]);
    }
    // dummyResults is a constant defined above, safe to omit from dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.trim() && !recentSearches.includes(searchQuery.trim())) {
      setRecentSearches([searchQuery.trim(), ...recentSearches.slice(0, 4)]);
    }
  };

  const clearRecent = () => {
    setRecentSearches([]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-charcoal/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed left-1/2 top-20 z-50 w-full max-w-2xl -translate-x-1/2 px-4"
          >
            <div className="overflow-hidden rounded-md bg-white shadow-elevated">
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-4">
                <Search className="h-5 w-5 text-neutral-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск товаров..."
                  className="flex-1 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="max-h-[500px] overflow-y-auto">
                {query.trim().length > 0 ? (
                  // Search results
                  <div className="p-2">
                    {results.length > 0 ? (
                      <>
                        {results.map((result) => (
                          <Link
                            key={result.id}
                            href={`/catalog/${result.slug}`}
                            onClick={onClose}
                            className="flex items-center gap-4 rounded-sm p-3 transition-colors hover:bg-neutral-50"
                          >
                            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded bg-gradient-to-br from-neutral-100 to-neutral-50">
                              <span className="text-xs text-neutral-300">
                                Velmora
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-neutral-900 line-clamp-2">
                                {result.name}
                              </h4>
                              <div className="mt-1 flex items-center gap-2">
                                {result.category && (
                                  <span className="text-xs text-neutral-500">
                                    {result.category}
                                  </span>
                                )}
                                <span className="text-sm font-semibold text-primary-600">
                                  {formatPrice(result.price)}
                                </span>
                              </div>
                            </div>
                          </Link>
                        ))}
                        <Link
                          href={`/catalog?search=${encodeURIComponent(query)}`}
                          onClick={onClose}
                          className="mt-2 flex items-center justify-center rounded-sm border border-neutral-200 py-3 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50"
                        >
                          Показать все результаты ({results.length})
                        </Link>
                      </>
                    ) : (
                      <div className="py-12 text-center">
                        <p className="text-sm text-neutral-500">
                          По запросу &quot;{query}&quot; ничего не найдено
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Recent and trending searches
                  <div className="divide-y divide-neutral-100 p-4">
                    {/* Recent searches */}
                    {recentSearches.length > 0 && (
                      <div className="pb-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                            <Clock className="h-3.5 w-3.5" />
                            Недавние
                          </h3>
                          <button
                            onClick={clearRecent}
                            className="text-xs text-neutral-400 transition-colors hover:text-neutral-600"
                          >
                            Очистить
                          </button>
                        </div>
                        <div className="space-y-1">
                          {recentSearches.map((search, index) => (
                            <button
                              key={index}
                              onClick={() => handleSearch(search)}
                              className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
                            >
                              <Search className="h-4 w-4 text-neutral-400" />
                              {search}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Trending searches */}
                    <div className="pt-4">
                      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Популярные запросы
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {trendingSearches.map((search, index) => (
                          <button
                            key={index}
                            onClick={() => handleSearch(search)}
                            className="rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm text-neutral-700 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
                          >
                            {search}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
