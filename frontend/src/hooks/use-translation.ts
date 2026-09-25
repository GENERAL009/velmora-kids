import { useMemo } from "react";
import { useLanguageStore } from "@/store/language";
import { getTranslations, type TranslationKeys } from "@/lib/i18n";

export function useTranslation(): TranslationKeys {
  const locale = useLanguageStore((s) => s.locale);
  return useMemo(() => getTranslations(locale), [locale]);
}
