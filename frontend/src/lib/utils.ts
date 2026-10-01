import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useLanguageStore } from "@/store/language";

/**
 * Merge Tailwind CSS classes with clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format price in Uzbek som (UZS)
 */
function currentLocale(): "ru" | "uz" {
  // The admin panel is Uzbek-only, whatever language the storefront is set to
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) return "uz";
  try {
    return useLanguageStore.getState().locale === "uz" ? "uz" : "ru";
  } catch {
    return "ru";
  }
}

export function formatPrice(amount: number, currency: string = "UZS"): string {
  const formatted = new Intl.NumberFormat("ru-UZ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

  const unit = currentLocale() === "uz" ? "so'm" : "сум";
  return `${formatted} ${currency === "UZS" ? unit : currency}`;
}

/**
 * Format date in the current UI language
 */
const UZ_MONTHS_LONG = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const UZ_MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];

export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric", ...options };
  if (currentLocale() !== "uz") {
    return d.toLocaleDateString("ru-RU", opts);
  }
  // Browsers render "uz" dates inconsistently (e.g. "2026 M09 30"), so build them by hand:
  // "30-sentabr, 2026" / "30-sen, 14:05"
  const month = d.getMonth();
  const monthName =
    opts.month === "short" ? UZ_MONTHS_SHORT[month] :
    opts.month === "numeric" || opts.month === "2-digit" ? String(month + 1).padStart(2, "0") :
    UZ_MONTHS_LONG[month];
  let out = opts.day ? `${d.getDate()}-${monthName}` : monthName;
  if (opts.year) out += `, ${d.getFullYear()}`;
  if (opts.hour) {
    out += `, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return out;
}

/**
 * Create a URL-safe slug from text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Truncate text to a given length with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trimEnd() + "...";
}

/**
 * Get full image URL from relative path
 */
export function getImageUrl(path: string): string {
  if (!path) return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' fill='%23f5f5f5'%3E%3Crect width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23ccc' font-size='14'%3ENo image%3C/text%3E%3C/svg%3E";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const mediaBase = baseUrl.replace("/api/v1", "");
  return `${mediaBase}/media/${path}`;
}

/**
 * Calculate discount percentage
 */
export function getDiscountPercentage(
  price: number,
  compareAtPrice: number
): number {
  if (!compareAtPrice || compareAtPrice <= price) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function (this: unknown, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Generate a range of numbers
 */
export function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Pluralize Russian words (simplified)
 */
export function pluralize(
  count: number,
  one: string,
  few: string,
  many: string
): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
