"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
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
      className="relative flex min-h-dvh flex-col items-center justify-center gap-6 bg-gradient-to-br from-cream via-primary-50/20 to-accent-50/10 px-4 text-center dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 sm:gap-10"
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
        <Sparkles
          strokeWidth={1.5}
          className="mx-auto mb-2 h-9 w-9 text-rose-400 drop-shadow-[0_0_12px_rgba(251,113,133,0.55)] sm:mb-3 sm:h-12 sm:w-12"
        />
        <h2 className="font-display text-4xl font-bold tracking-tight text-charcoal drop-shadow-sm dark:text-white sm:text-6xl md:text-7xl">
          Velmora <span className="text-rose-400">Kids</span>
        </h2>
        <p className="mt-3 text-lg font-semibold text-charcoal/90 dark:text-white sm:mt-4 sm:text-2xl">
          {t.hero.subtitle}
        </p>
        <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-300 sm:text-base">
          {t.hero.description}
        </p>
      </motion.div>

      <div className="relative flex w-full max-w-[640px] flex-row justify-center gap-3 sm:gap-6">
        <GenderCard
          gender="girls"
          image={girlsImage}
          label={t.hero.forGirls}
          onSelect={onSelect}
        />
        <GenderCard
          gender="boys"
          image={boysImage}
          label={t.hero.forBoys}
          onSelect={onSelect}
        />
      </div>
    </motion.div>
  );
}

const GENDER_CARD_STYLES = {
  girls: {
    frame: "from-pink-200 via-pink-100/80 to-white/70 dark:from-pink-400/60 dark:via-pink-300/30 dark:to-white/20",
    glow: "shadow-[0_24px_60px_-18px_rgba(236,72,153,0.55)]",
    placeholder: "from-pink-100 via-rose-50 to-pink-200 dark:from-pink-950/60 dark:via-rose-950/40 dark:to-pink-900/40",
    footer: "bg-white/95 dark:bg-neutral-900/90",
    button: "from-rose-400 to-pink-500",
    emoji: "\u{1F467}",
    enterX: -30,
  },
  boys: {
    frame: "from-sky-200 via-blue-100/80 to-white/70 dark:from-sky-400/60 dark:via-blue-300/30 dark:to-white/20",
    glow: "shadow-[0_24px_60px_-18px_rgba(59,130,246,0.55)]",
    placeholder: "from-sky-100 via-blue-50 to-indigo-100 dark:from-blue-950/60 dark:via-sky-950/40 dark:to-indigo-900/40",
    footer: "bg-white/95 dark:bg-neutral-900/90",
    button: "from-blue-400 to-blue-600",
    emoji: "\u{1F466}",
    enterX: 30,
  },
} as const;

function GenderCard({
  gender,
  image,
  label,
  onSelect,
}: {
  gender: "girls" | "boys";
  image?: string;
  label: string;
  onSelect: (g: GenderChoice) => void;
}) {
  const s = GENDER_CARD_STYLES[gender];
  return (
    <motion.button
      type="button"
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, x: s.enterX }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.35 }}
      onClick={() => onSelect(gender)}
      aria-label={label}
      className={cn(
        "group relative w-1/2 max-w-[300px] rounded-[22px] bg-gradient-to-b p-[3px] backdrop-blur-md transition-shadow sm:rounded-[28px]",
        s.frame,
        s.glow
      )}
    >
      <div className="overflow-hidden rounded-[19px] sm:rounded-[25px]">
        <div className={cn("relative aspect-[4/3.3] w-full overflow-hidden bg-gradient-to-br", s.placeholder)}>
          {image ? (
            <Image
              src={image}
              alt={label}
              fill
              sizes="(max-width: 640px) 50vw, 300px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              unoptimized
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-5xl sm:text-7xl">
              {s.emoji}
            </span>
          )}
        </div>
        <div className={cn("flex items-center justify-between gap-2 px-3 py-2.5 text-left sm:px-5 sm:py-4", s.footer)}>
          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 sm:text-base">
            {label}
          </span>
          <span
            className={cn(
              "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:translate-x-1 sm:h-9 sm:w-9",
              s.button
            )}
          >
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </span>
        </div>
      </div>
    </motion.button>
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
