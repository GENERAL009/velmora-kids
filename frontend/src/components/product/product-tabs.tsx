"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Package, Truck, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type TabId = "description" | "specs" | "size-guide" | "shipping" | "reviews";

interface Tab {
  id: TabId;
  label: string;
  icon?: React.ReactNode;
}

interface ProductTabsProps {
  description: string;
  material?: string;
  careInstructions?: string;
  specifications?: Record<string, string>;
  className?: string;
}

const tabs: Tab[] = [
  { id: "description", label: "Описание" },
  { id: "specs", label: "Характеристики" },
  { id: "size-guide", label: "Размерная сетка" },
  { id: "shipping", label: "Доставка" },
  { id: "reviews", label: "Отзывы" },
];

export function ProductTabs({
  description,
  material,
  careInstructions,
  specifications = {},
  className,
}: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("description");

  return (
    <div className={cn("space-y-6", className)}>
      {/* Tab headers */}
      <div className="border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative whitespace-nowrap px-6 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "text-primary-600"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                )}
              >
                <span className="flex items-center gap-2">
                  {tab.icon}
                  {tab.label}
                </span>

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="py-4"
      >
        {activeTab === "description" && (
          <div className="prose prose-sm max-w-none">
            <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">{description}</p>
            {material && (
              <div className="mt-6">
                <h4 className="mb-2 text-sm font-semibold text-charcoal dark:text-white">
                  Материал
                </h4>
                <p className="text-neutral-700 dark:text-neutral-300">{material}</p>
              </div>
            )}
            {careInstructions && (
              <div className="mt-6">
                <h4 className="mb-2 text-sm font-semibold text-charcoal dark:text-white">
                  Уход за изделием
                </h4>
                <p className="text-neutral-700 dark:text-neutral-300">{careInstructions}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "specs" && (
          <div className="space-y-3">
            {Object.entries(specifications).length > 0 ? (
              Object.entries(specifications).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 py-3 last:border-0"
                >
                  <span className="font-medium text-neutral-600 dark:text-neutral-400">{key}</span>
                  <span className="text-right text-neutral-900 dark:text-neutral-200">{value}</span>
                </div>
              ))
            ) : (
              <div className="rounded-md bg-neutral-50 dark:bg-neutral-800/50 p-6 text-center">
                <Package className="mx-auto mb-2 h-8 w-8 text-neutral-300 dark:text-neutral-600" />
                <p className="text-sm text-neutral-500">
                  Характеристики скоро будут добавлены
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "size-guide" && (
          <div className="space-y-6">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Используйте нашу размерную сетку, чтобы подобрать идеальный размер
              для вашего ребенка.
            </p>

            {/* Sample size chart */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800/50">
                    <th className="border border-neutral-200 dark:border-neutral-700 px-4 py-2 text-left font-semibold text-charcoal dark:text-white">
                      Размер
                    </th>
                    <th className="border border-neutral-200 dark:border-neutral-700 px-4 py-2 text-left font-semibold text-charcoal dark:text-white">
                      Возраст
                    </th>
                    <th className="border border-neutral-200 dark:border-neutral-700 px-4 py-2 text-left font-semibold text-charcoal dark:text-white">
                      Рост (см)
                    </th>
                    <th className="border border-neutral-200 dark:border-neutral-700 px-4 py-2 text-left font-semibold text-charcoal dark:text-white">
                      Обхват груди (см)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { size: "86", age: "1-1.5 года", height: "86", chest: "52" },
                    { size: "92", age: "1.5-2 года", height: "92", chest: "54" },
                    { size: "98", age: "2-3 года", height: "98", chest: "56" },
                    { size: "104", age: "3-4 года", height: "104", chest: "58" },
                    { size: "110", age: "4-5 лет", height: "110", chest: "60" },
                    { size: "116", age: "5-6 лет", height: "116", chest: "62" },
                  ].map((row) => (
                    <tr key={row.size} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <td className="border border-neutral-200 dark:border-neutral-700 px-4 py-2 font-medium text-neutral-900 dark:text-neutral-200">
                        {row.size}
                      </td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-4 py-2 text-neutral-700 dark:text-neutral-300">
                        {row.age}
                      </td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-4 py-2 text-neutral-700 dark:text-neutral-300">
                        {row.height}
                      </td>
                      <td className="border border-neutral-200 dark:border-neutral-700 px-4 py-2 text-neutral-700 dark:text-neutral-300">
                        {row.chest}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-neutral-500">
              * Размеры могут незначительно отличаться в зависимости от модели.
            </p>
          </div>
        )}

        {activeTab === "shipping" && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 rounded-md bg-secondary-50 dark:bg-secondary-950/20 p-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary-500 text-white">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="mb-1 font-semibold text-charcoal dark:text-white">
                  Бесплатная доставка
                </h4>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  Для заказов от 500 000 сум по Ташкенту
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="mb-2 font-semibold text-charcoal dark:text-white">
                  Сроки доставки
                </h4>
                <ul className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
                    <span>По Ташкенту: 1-2 рабочих дня</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
                    <span>По регионам: 3-5 рабочих дней</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="mb-2 font-semibold text-charcoal dark:text-white">
                  Способы доставки
                </h4>
                <ul className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
                    <span>Курьерская доставка</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
                    <span>Самовывоз из магазина</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="mb-2 font-semibold text-charcoal dark:text-white">
                  Возврат и обмен
                </h4>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  Вы можете вернуть товар в течение 14 дней с момента покупки,
                  если он не был в использовании и сохранен товарный вид.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="rounded-md bg-neutral-50 dark:bg-neutral-800/50 p-8 text-center">
            <MessageCircle className="mx-auto mb-3 h-10 w-10 text-neutral-300 dark:text-neutral-600" />
            <h4 className="mb-2 font-semibold text-charcoal dark:text-white">
              Пока нет отзывов
            </h4>
            <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
              Будьте первым, кто оставит отзыв об этом товаре
            </p>
            <button className="rounded-sm bg-primary-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600">
              Написать отзыв
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
