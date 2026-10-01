"use client";

import React, { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  showCheckbox?: boolean;
  selectedItems?: Set<string | number>;
  onSelectionChange?: (selected: Set<string | number>) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  isLoading = false,
  emptyMessage = "Ma'lumotlar yo'q",
  showCheckbox = false,
  selectedItems = new Set(),
  onSelectionChange,
  className,
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = (a as Record<string, unknown>)[sortConfig.key] as string | number;
      const bValue = (b as Record<string, unknown>)[sortConfig.key] as string | number;

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    if (selectedItems.size === data.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(keyExtractor)));
    }
  };

  const handleSelectItem = (key: string | number) => {
    if (!onSelectionChange) return;

    const newSelected = new Set(selectedItems);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    onSelectionChange(newSelected);
  };

  if (isLoading) {
    return (
      <div className={cn("overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700", className)}>
        <table className="w-full min-w-[640px]">
          <thead className="bg-neutral-50 dark:bg-neutral-800">
            <tr>
              {showCheckbox && <th className="w-12 px-4 py-3" />}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider",
                    column.className
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-700">
            {[...Array(5)].map((_, idx) => (
              <tr key={idx} className="animate-pulse">
                {showCheckbox && (
                  <td className="px-4 py-4">
                    <div className="w-4 h-4 bg-neutral-200 dark:bg-neutral-700 rounded" />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-4">
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={cn("overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700", className)}>
        <div className="bg-white dark:bg-neutral-900 p-12 text-center">
          <p className="text-neutral-500 dark:text-neutral-400">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700", className)}>
      <table className="w-full min-w-[640px]">
        <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
          <tr>
            {showCheckbox && (
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedItems.size === data.length && data.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "px-4 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider",
                  column.sortable && "cursor-pointer select-none hover:bg-neutral-100 dark:hover:bg-neutral-700",
                  column.className
                )}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-2">
                  <span>{column.label}</span>
                  {column.sortable && (
                    <span className="text-neutral-400">
                      {sortConfig?.key === column.key ? (
                        sortConfig.direction === "asc" ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      ) : (
                        <ChevronsUpDown className="w-4 h-4" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-700">
          {sortedData.map((item) => {
            const itemKey = keyExtractor(item);
            const isSelected = selectedItems.has(itemKey);

            return (
              <tr
                key={itemKey}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  "transition-colors",
                  onRowClick && "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800",
                  isSelected && "bg-primary-50 dark:bg-primary-900/10"
                )}
              >
                {showCheckbox && (
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectItem(itemKey)}
                      className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-4 py-4 text-sm text-neutral-900 dark:text-neutral-100",
                      column.className
                    )}
                  >
                    {column.render ? column.render(item) : String((item as Record<string, unknown>)[column.key])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
