"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Package, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";
import { useDeliveryRules } from "@/hooks/use-delivery";
import { formatPrice } from "@/lib/utils";

type TabId = "description" | "specs" | "shipping";

interface Tab {
  id: TabId;
  label: string;
  icon?: React.ReactNode;
}

interface ProductTabsProps {
  description: string;
  specifications?: Record<string, string>;
  className?: string;
}

export function ProductTabs({
  description,
  specifications = {},
  className,
}: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("description");
  const t = useTranslation();
  const tp = t.productPage;
  const { freeFrom } = useDeliveryRules();

  const tabs: Tab[] = [
    { id: "description", label: t.product.description },
    { id: "specs", label: t.product.characteristics },
    { id: "shipping", label: t.cart.delivery },
  ];

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
                  {tp.specs.empty}
                </p>
              </div>
            )}
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
                  {tp.trust.freeDelivery}
                </h4>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  {tp.shipping.freeDeliveryDesc.replace("{amount}", formatPrice(freeFrom))}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="mb-2 font-semibold text-charcoal dark:text-white">
                  {tp.shipping.deliveryTimes}
                </h4>
                <ul className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
                    <span>{tp.shipping.tashkent}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
                    <span>{tp.shipping.regions}</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="mb-2 font-semibold text-charcoal dark:text-white">
                  {tp.shipping.methods}
                </h4>
                <ul className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
                    <span>{tp.shipping.courier}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
                    <span>{tp.shipping.pickup}</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="mb-2 font-semibold text-charcoal dark:text-white">
                  {tp.shipping.returnsTitle}
                </h4>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  {tp.shipping.returnsText}
                </p>
              </div>
            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
}
