"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

export function PromoBanner() {
  const t = useTranslation();
  return (
    <section className="py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-secondary-50 via-secondary-100/50 to-accent-50 dark:from-secondary-950/20 dark:via-secondary-900/10 dark:to-accent-950/20 sm:rounded-xl">
          {/* Decorative elements */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-secondary-200/20 blur-2xl dark:bg-secondary-700/10" />
            <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-accent-200/20 blur-2xl dark:bg-accent-700/10" />
            <motion.div
              animate={{ y: [-6, 6, -6] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-[15%] top-[15%]"
            >
              <Star className="h-4 w-4 rotate-12 text-secondary-300 dark:text-secondary-700" />
            </motion.div>
            <motion.div
              animate={{ y: [6, -6, 6] }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
              className="absolute right-[20%] bottom-[20%]"
            >
              <Star className="h-3 w-3 -rotate-6 text-accent-300 dark:text-accent-700" />
            </motion.div>
          </div>

          <div className="relative flex flex-col items-center gap-6 p-6 sm:flex-row sm:gap-8 sm:p-12 lg:p-16">
            {/* Image placeholder */}
            <div className="flex-shrink-0">
              <div className="flex h-36 w-36 items-center justify-center rounded-full bg-white/50 dark:bg-white/5 sm:h-48 sm:w-48 lg:h-64 lg:w-64">
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/70 dark:bg-white/10 sm:h-36 sm:w-36 lg:h-52 lg:w-52">
                  <span className="font-display text-4xl font-bold text-secondary-400 sm:text-5xl lg:text-6xl">
                    -30%
                  </span>
                </div>
              </div>
            </div>

            {/* Text content */}
            <div className="flex-1 text-center sm:text-left">
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-block text-xs font-semibold uppercase tracking-widest text-secondary-600"
              >
                {t.catalogUi.promoBanner.badge}
              </motion.span>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="mt-3 font-display text-2xl font-bold text-charcoal dark:text-white sm:text-3xl lg:text-4xl"
              >
                {t.catalogUi.promoBanner.title}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="mt-3 max-w-md text-neutral-600 dark:text-neutral-400 leading-relaxed"
              >
                {t.catalogUi.promoBanner.description}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="mt-6"
              >
                <Link href="/catalog?is_on_sale=true">
                  <Button
                    variant="secondary"
                    size="lg"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    {t.catalogUi.promoBanner.cta}
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
