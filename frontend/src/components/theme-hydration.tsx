"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/theme";

export function ThemeHydration() {
  const isDark = useThemeStore((s) => s.isDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return null;
}
