import { ru, type TranslationKeys } from "./ru";
import { uz } from "./uz";
import type { Locale } from "@/store/language";

const translations: Record<Locale, TranslationKeys> = { ru, uz };

export function getTranslations(locale: Locale): TranslationKeys {
  return translations[locale] ?? ru;
}

export type { TranslationKeys };
