"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  const t = useTranslation();

  if (totalPages <= 1) {
    return null;
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      // Show all pages if total is 7 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage <= 3) {
        // Near the beginning
        pages.push(2, 3, 4, "ellipsis", totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push("ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        // In the middle
        pages.push(
          "ellipsis",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "ellipsis",
          totalPages
        );
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav
      className={cn("flex items-center justify-center gap-1", className)}
      aria-label={t.catalogUi.pagination.label}
    >
      {/* Previous button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-sm border transition-all",
          currentPage === 1
            ? "cursor-not-allowed border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-300 dark:text-neutral-600"
            : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-950/20 hover:text-primary-600"
        )}
        aria-label={t.catalogUi.pagination.prev}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((page, index) => {
          if (page === "ellipsis") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="flex h-10 w-10 items-center justify-center text-neutral-400"
              >
                ...
              </span>
            );
          }

          const pageNumber = page as number;
          const isActive = pageNumber === currentPage;

          return (
            <button
              key={pageNumber}
              onClick={() => onPageChange(pageNumber)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-sm border text-sm font-medium transition-all",
                isActive
                  ? "border-primary-500 bg-primary-500 text-white shadow-sm"
                  : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-950/20 hover:text-primary-600"
              )}
              aria-label={t.catalogUi.pagination.page.replace("{page}", String(pageNumber))}
              aria-current={isActive ? "page" : undefined}
            >
              {pageNumber}
            </button>
          );
        })}
      </div>

      {/* Next button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-sm border transition-all",
          currentPage === totalPages
            ? "cursor-not-allowed border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-300 dark:text-neutral-600"
            : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-950/20 hover:text-primary-600"
        )}
        aria-label={t.catalogUi.pagination.next}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
