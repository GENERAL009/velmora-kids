"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Sun, Moon, Globe } from "lucide-react";
import { useThemeStore } from "@/store/theme";
import { useLanguageStore, type Locale } from "@/store/language";
import { useTranslation } from "@/hooks/use-translation";

export default function SettingsPage() {
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const locale = useLanguageStore((s) => s.locale);
  const setLocale = useLanguageStore((s) => s.setLocale);
  const t = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-charcoal dark:text-white">
        {t.settings.title}
      </h1>

      {/* Theme Settings */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40">
            {isDark ? (
              <Moon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <Sun className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            )}
          </div>
          <div>
            <h2 className="font-display text-lg text-charcoal dark:text-white">
              {t.settings.theme}
            </h2>
            <p className="text-sm text-neutral-500">
              {t.settings.themeDescription}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => { if (isDark) toggleTheme(); }}
            className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
              !isDark
                ? "border-primary-400 bg-primary-50/50 dark:border-primary-600 dark:bg-primary-950/20"
                : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600"
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <Sun className="h-6 w-6 text-amber-500" />
            </div>
            <div className="text-left">
              <p className="font-medium text-charcoal dark:text-white">{t.settings.light}</p>
              <p className="text-xs text-neutral-500">{t.settings.lightDesc}</p>
            </div>
            {!isDark && (
              <div className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary-500">
                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>

          <button
            onClick={() => { if (!isDark) toggleTheme(); }}
            className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
              isDark
                ? "border-primary-400 bg-primary-50/50 dark:border-primary-600 dark:bg-primary-950/20"
                : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600"
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <Moon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
            </div>
            <div className="text-left">
              <p className="font-medium text-charcoal dark:text-white">{t.settings.dark}</p>
              <p className="text-xs text-neutral-500">{t.settings.darkDesc}</p>
            </div>
            {isDark && (
              <div className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary-500">
                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Language Settings */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <Globe className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="font-display text-lg text-charcoal dark:text-white">
              {t.settings.language}
            </h2>
            <p className="text-sm text-neutral-500">
              {t.settings.languageDescription}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => setLocale("ru")}
            className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
              locale === "ru"
                ? "border-primary-400 bg-primary-50/50 dark:border-primary-600 dark:bg-primary-950/20"
                : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600"
            }`}
          >
            <span className="text-2xl">🇷🇺</span>
            <div className="text-left">
              <p className="font-medium text-charcoal dark:text-white">{t.settings.russian}</p>
              <p className="text-xs text-neutral-500">{t.settings.russianLang}</p>
            </div>
            {locale === "ru" && (
              <div className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary-500">
                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>

          <button
            onClick={() => setLocale("uz")}
            className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
              locale === "uz"
                ? "border-primary-400 bg-primary-50/50 dark:border-primary-600 dark:bg-primary-950/20"
                : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600"
            }`}
          >
            <span className="text-2xl">🇺🇿</span>
            <div className="text-left">
              <p className="font-medium text-charcoal dark:text-white">{t.settings.uzbek}</p>
              <p className="text-xs text-neutral-500">{t.settings.uzbekLang}</p>
            </div>
            {locale === "uz" && (
              <div className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary-500">
                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
