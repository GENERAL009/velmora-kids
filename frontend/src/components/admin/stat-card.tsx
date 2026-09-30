import React from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, icon: Icon, change, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-soft border border-neutral-100 dark:border-neutral-700 transition-all hover:shadow-card",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            {value}
          </p>
          {change && (
            <div className="flex items-center gap-1">
              {change.isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  change.isPositive ? "text-green-600" : "text-red-600"
                )}
              >
                {change.isPositive ? "+" : ""}
                {change.value}%
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-1">
                oldingi davrga nisbatan
              </span>
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
