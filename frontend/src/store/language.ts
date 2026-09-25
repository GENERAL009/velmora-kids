import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Locale = "ru" | "uz";

interface LanguageState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      locale: "ru",
      setLocale: (locale) => set({ locale }),
    }),
    { name: "velmora-language" }
  )
);
