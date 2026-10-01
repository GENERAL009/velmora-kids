"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Star } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import type { TranslationKeys } from "@/lib/i18n";

const getCategories = (t: TranslationKeys) => [
  {
    id: "girls",
    name: t.catalogUi.gender.girls,
    description: t.catalogUi.categoriesSection.girlsDesc,
    count: 124,
    href: "/catalog?gender=girls",
    gradient: "from-primary-100 via-primary-50 to-rose-50",
    accent: "text-primary-600",
  },
  {
    id: "boys",
    name: t.catalogUi.gender.boys,
    description: t.catalogUi.categoriesSection.boysDesc,
    count: 98,
    href: "/catalog?gender=boys",
    gradient: "from-secondary-100 via-secondary-50 to-emerald-50",
    accent: "text-secondary-700",
  },
  {
    id: "sale",
    name: t.catalogUi.categoriesSection.sale,
    description: t.catalogUi.categoriesSection.saleDesc,
    count: 76,
    href: "/catalog?is_on_sale=true",
    gradient: "from-accent-100 via-accent-50 to-amber-50",
    accent: "text-accent-700",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

export function CategoriesSection() {
  const t = useTranslation();
  const categories = getCategories(t);
  return (
    <section className="relative py-16 sm:py-20 lg:py-24">
      {/* Decorative */}
      <div className="pointer-events-none absolute right-8 top-12">
        <Star className="h-5 w-5 rotate-12 text-accent-200" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="font-display text-3xl font-bold text-charcoal dark:text-white sm:text-4xl"
          >
            {t.catalog.categories}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto mt-3 max-w-md text-neutral-500"
          >
            {t.catalogUi.categoriesSection.subtitle}
          </motion.p>
        </div>

        {/* Category cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3"
        >
          {categories.map((category) => (
            <motion.div key={category.id} variants={itemVariants}>
              <Link href={category.href} className="group block">
                <div
                  className={`relative overflow-hidden rounded-lg bg-gradient-to-br ${category.gradient} p-8 transition-all duration-500 group-hover:shadow-card sm:p-10`}
                >
                  {/* Decorative circles */}
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/20 transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/15" />

                  <div className="relative">
                    <h3 className="font-display text-2xl font-bold text-charcoal dark:text-white">
                      {category.name}
                    </h3>
                    <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                      {category.description}
                    </p>
                    <div className="mt-4 flex items-center justify-end">
                      <span
                        className={`flex items-center gap-1 text-sm font-medium ${category.accent} transition-all group-hover:gap-2`}
                      >
                        {t.catalogUi.categoriesSection.view}
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
