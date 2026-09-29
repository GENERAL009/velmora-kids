"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { create } from "zustand";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { apiGet } from "@/lib/api";
import { useTranslation } from "@/hooks/use-translation";
import { useThemeStore } from "@/store/theme";
import type { Banner } from "@/types";

interface SiteSettings {
  hero_video_url?: string;
  hero_video_url_dark?: string;
  hero_video_poster?: string;
  hero_video_poster_dark?: string;
  hero_girls_image_light?: string;
  hero_girls_image_dark?: string;
  hero_boys_image_light?: string;
  hero_boys_image_dark?: string;
}

type GenderChoice = "girls" | "boys" | null;

interface HeroStoreState {
  gender: GenderChoice;
  setGender: (g: GenderChoice) => void;
}

export const useHeroStore = create<HeroStoreState>((set) => ({
  gender: null,
  setGender: (gender) => set({ gender }),
}));

function GenderSelector({ onSelect }: { onSelect: (g: GenderChoice) => void }) {
  const t = useTranslation();
  const isDark = useThemeStore((s) => s.isDark);
  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => apiGet<SiteSettings>("/settings/site"),
    staleTime: 5 * 60 * 1000,
  });

  const videoUrl = isDark
    ? (siteSettings?.hero_video_url_dark || siteSettings?.hero_video_url)
    : siteSettings?.hero_video_url;
  const videoPoster = isDark
    ? (siteSettings?.hero_video_poster_dark || siteSettings?.hero_video_poster)
    : siteSettings?.hero_video_poster;

  const girlsImage = isDark
    ? (siteSettings?.hero_girls_image_dark || siteSettings?.hero_girls_image_light)
    : siteSettings?.hero_girls_image_light;
  const boysImage = isDark
    ? (siteSettings?.hero_boys_image_dark || siteSettings?.hero_boys_image_light)
    : siteSettings?.hero_boys_image_light;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex min-h-dvh flex-col items-center justify-center gap-6 bg-gradient-to-br from-cream via-primary-50/20 to-accent-50/10 px-4 text-center dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 sm:gap-8"
    >
      {videoUrl && (
        <div className="absolute inset-0">
          <video
            key={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            src={videoUrl}
            poster={videoPoster || undefined}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] dark:bg-neutral-950/60" />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative"
      >
        <Sparkles className="mx-auto mb-3 h-8 w-8 text-primary-400 sm:mb-4 sm:h-10 sm:w-10" />
        <h2 className="font-display text-2xl font-bold text-charcoal dark:text-white sm:text-4xl md:text-5xl">
          {t.hero.title}
        </h2>
        <p className="mt-3 text-lg text-neutral-500 dark:text-neutral-400">
          {t.hero.subtitle}
        </p>
      </motion.div>

      <div className="relative flex flex-col gap-4 sm:flex-row sm:gap-6">
        <motion.button
          whileHover={{ scale: 1.05, y: -4 }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
          onClick={() => onSelect("girls")}
          className="group relative overflow-hidden rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50 shadow-lg transition-shadow hover:shadow-xl dark:border-pink-800 dark:from-pink-950/40 dark:via-rose-950/30 dark:to-fuchsia-950/20"
        >
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-pink-200/40 blur-2xl transition-all group-hover:bg-pink-300/50 dark:bg-pink-700/20" />
          {girlsImage ? (
            <div className="relative h-40 w-40 sm:h-52 sm:w-52">
              <Image
                src={girlsImage}
                alt={t.hero.forGirls}
                fill
                className="object-cover rounded-2xl"
                unoptimized
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent rounded-b-2xl p-3">
                <p className="text-sm font-semibold text-white sm:text-base">
                  {t.hero.forGirls}
                </p>
              </div>
            </div>
          ) : (
            <div className="px-8 py-6 sm:px-12 sm:py-10">
              <span className="relative text-4xl sm:text-5xl">👧</span>
              <p className="relative mt-2 text-base font-semibold text-pink-700 dark:text-pink-300 sm:mt-3 sm:text-lg">
                {t.hero.forGirls}
              </p>
            </div>
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05, y: -4 }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
          onClick={() => onSelect("boys")}
          className="group relative overflow-hidden rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 shadow-lg transition-shadow hover:shadow-xl dark:border-blue-800 dark:from-blue-950/40 dark:via-sky-950/30 dark:to-indigo-950/20"
        >
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-200/40 blur-2xl transition-all group-hover:bg-blue-300/50 dark:bg-blue-700/20" />
          {boysImage ? (
            <div className="relative h-40 w-40 sm:h-52 sm:w-52">
              <Image
                src={boysImage}
                alt={t.hero.forBoys}
                fill
                className="object-cover rounded-2xl"
                unoptimized
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent rounded-b-2xl p-3">
                <p className="text-sm font-semibold text-white sm:text-base">
                  {t.hero.forBoys}
                </p>
              </div>
            </div>
          ) : (
            <div className="px-8 py-6 sm:px-12 sm:py-10">
              <span className="relative text-4xl sm:text-5xl">👦</span>
              <p className="relative mt-2 text-base font-semibold text-blue-700 dark:text-blue-300 sm:mt-3 sm:text-lg">
                {t.hero.forBoys}
              </p>
            </div>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

function BannerCard({ banner }: { banner: Banner }) {
  const content = (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800 sm:aspect-[16/7] sm:rounded-2xl lg:aspect-[16/6]">
      {banner.image ? (
        <Image
          src={banner.image}
          alt={banner.title}
          fill
          sizes="(max-width: 768px) 100vw, 1200px"
          className="object-cover transition-transform duration-700 hover:scale-105"
          priority
          unoptimized
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-primary-900/30 dark:to-secondary-900/30">
          <span className="font-display text-4xl text-neutral-300 dark:text-neutral-600">Velmora Kids</span>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
        {banner.subtitle && (
          <p className="text-xs font-medium uppercase tracking-wider text-white/70 sm:text-sm">
            {banner.subtitle}
          </p>
        )}
        <h3 className="mt-1 text-lg font-bold text-white sm:text-2xl">
          {banner.title}
        </h3>
      </div>
    </div>
  );

  if (banner.link) {
    return (
      <Link href={banner.link} className="block w-full flex-shrink-0">
        {content}
      </Link>
    );
  }

  return <div className="block w-full flex-shrink-0">{content}</div>;
}

function BannerCarousel({ gender }: { gender: "girls" | "boys" }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: banners = [] } = useQuery({
    queryKey: ["banners", "hero"],
    queryFn: () => apiGet<Banner[]>("/banners?position=hero"),
    staleTime: 60 * 1000,
  });

  const totalSlides = banners.length;

  const isAutoPlaying = useRef(true);
  const autoPlayTimer = useRef<ReturnType<typeof setInterval>>();

  const goTo = useCallback((index: number, wrap = false) => {
    if (totalSlides === 0) return;
    const target = wrap ? ((index % totalSlides) + totalSlides) % totalSlides : Math.max(0, Math.min(index, totalSlides - 1));
    setCurrentIndex(target);
    const el = containerRef.current;
    if (el) {
      const slideWidth = el.offsetWidth;
      el.scrollTo({ left: slideWidth * target, behavior: "smooth" });
    }
  }, [totalSlides]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el || totalSlides === 0) return;
    const slideWidth = el.offsetWidth;
    const idx = Math.round(el.scrollLeft / slideWidth);
    setCurrentIndex(Math.max(0, Math.min(idx, totalSlides - 1)));
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  });

  useEffect(() => {
    if (totalSlides <= 1) return;
    const start = () => {
      autoPlayTimer.current = setInterval(() => {
        if (isAutoPlaying.current) goTo(currentIndex + 1, true);
      }, 4000);
    };
    start();
    return () => clearInterval(autoPlayTimer.current);
  }, [totalSlides, currentIndex, goTo]);

  const handleManualNav = (index: number) => {
    isAutoPlaying.current = false;
    goTo(index, true);
    setTimeout(() => { isAutoPlaying.current = true; }, 8000);
  };

  const genderColor = gender === "girls" ? "bg-pink-500" : "bg-blue-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      <div
        ref={containerRef}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto px-4 sm:px-6 lg:px-8"
      >
        {banners.length === 0 &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-full flex-shrink-0 snap-center px-1">
              <div className="aspect-[4/3] animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800 sm:aspect-[16/7] sm:rounded-2xl lg:aspect-[16/6]" />
            </div>
          ))}

        {banners.map((banner) => (
          <div key={banner.id} className="w-full flex-shrink-0 snap-center px-1">
            <BannerCard banner={banner} />
          </div>
        ))}
      </div>

      {totalSlides > 1 && (
        <>
          <button
            onClick={() => handleManualNav(currentIndex - 1)}
            className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-neutral-700 shadow-lg backdrop-blur-sm transition-all hover:bg-white dark:bg-neutral-800/80 dark:text-neutral-200 sm:left-4 sm:h-12 sm:w-12"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <button
            onClick={() => handleManualNav(currentIndex + 1)}
            className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-neutral-700 shadow-lg backdrop-blur-sm transition-all hover:bg-white dark:bg-neutral-800/80 dark:text-neutral-200 sm:right-4 sm:h-12 sm:w-12"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </>
      )}

      {totalSlides > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => handleManualNav(i)}
              className={cn(
                "h-2.5 rounded-full transition-all duration-300",
                i === currentIndex
                  ? cn("w-8", genderColor)
                  : "w-2.5 bg-neutral-300 hover:bg-neutral-400 dark:bg-neutral-600 dark:hover:bg-neutral-500"
              )}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function HeroSection() {
  const gender = useHeroStore((s) => s.gender);
  const setGender = useHeroStore((s) => s.setGender);
  const t = useTranslation();

  return (
    <section className="relative overflow-hidden">
      <AnimatePresence mode="wait">
        {!gender ? (
          <motion.div key="selector" exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
            <GenderSelector onSelect={setGender} />
          </motion.div>
        ) : (
          <motion.div
            key="carousel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-gradient-to-br from-cream via-primary-50/20 to-accent-50/10 pb-6 pt-20 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 sm:pb-8 lg:pt-24"
          >
            <div className="mx-auto max-w-7xl">
              <div className="mb-4 flex items-center gap-3 px-4 sm:px-6 lg:px-8">
                <button
                  onClick={() => setGender(null)}
                  className="rounded-full border border-neutral-200 bg-white/80 px-4 py-1.5 text-sm font-medium text-neutral-600 backdrop-blur-sm transition-colors hover:bg-white dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300"
                >
                  {t.hero.changeChoice}
                </button>
              </div>
              <BannerCarousel gender={gender} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
