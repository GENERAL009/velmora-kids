"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Save, Loader2, Globe, Phone, Video, FileText, BadgeCheck, Plus, ArrowUp, ArrowDown,
  Search as SearchIcon, CreditCard, Upload, Image as ImageIcon, Trash2,
  AlertTriangle,
} from "lucide-react";
import { apiGet, apiPut, apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { TRUST_ICONS, type TrustBadge } from "@/components/product/trust-badges";

interface SiteSettings {
  phone_primary: string;
  phone_secondary: string;
  email: string;
  instagram_url: string;
  telegram_url: string;
  facebook_url: string;
  tiktok_url: string;
  address: string;
  working_hours: string;
  hero_video_url: string;
  hero_video_poster: string;
  logo_header: string;
  logo_footer: string;
  logo_favicon: string;
  footer_about: string;
  meta_title: string;
  meta_description: string;
  payment_card_number: string;
  payment_card_holder: string;
  payment_card_bank: string;
  payment_bank_name: string;
  payment_bank_account: string;
  payment_bank_mfo: string;
  payment_bank_inn: string;
  trust_badges?: TrustBadge[];
}

const TEXT_SECTIONS = [
  {
    title: "Kontaktlar",
    icon: Phone,
    fields: [
      { key: "phone_primary", label: "Asosiy telefon", placeholder: "+998 71 200 00 00" },
      { key: "phone_secondary", label: "Qo'shimcha telefon", placeholder: "+998 90 000 00 00" },
      { key: "email", label: "Email", placeholder: "info@velmora.uz" },
      { key: "address", label: "Manzil", placeholder: "Toshkent, O'zbekiston" },
      { key: "working_hours", label: "Ish vaqti", placeholder: "Du-Ju: 09:00 - 18:00" },
    ],
  },
  {
    title: "Ijtimoiy tarmoqlar",
    icon: Globe,
    fields: [
      { key: "instagram_url", label: "Instagram", placeholder: "https://instagram.com/velmora.kids" },
      { key: "telegram_url", label: "Telegram", placeholder: "https://t.me/velmorakids" },
      { key: "facebook_url", label: "Facebook", placeholder: "https://facebook.com/velmorakids" },
      { key: "tiktok_url", label: "TikTok", placeholder: "https://tiktok.com/@velmorakids" },
    ],
  },
  {
    title: "Matnli kontent",
    icon: FileText,
    fields: [
      { key: "footer_about", label: "Kompaniya haqida (futer)", placeholder: "Velmora Kids — ...", multiline: true },
    ],
  },
  {
    title: "To'lov — Karta",
    icon: CreditCard,
    fields: [
      { key: "payment_card_number", label: "Karta raqami", placeholder: "8600 1234 5678 9012" },
      { key: "payment_card_holder", label: "Qabul qiluvchi", placeholder: "ABDULLOH RAHIMOV" },
      { key: "payment_card_bank", label: "Bank/Tizim", placeholder: "Uzcard" },
    ],
  },
  {
    title: "SEO",
    icon: SearchIcon,
    fields: [
      { key: "meta_title", label: "Meta Title", placeholder: "Velmora Kids — ..." },
      { key: "meta_description", label: "Meta Description", placeholder: "Onlayn do'kon...", multiline: true },
    ],
  },
] as const;

const UPLOAD_FIELDS = [
  {
    title: "Orqa fon video",
    icon: Video,
    items: [
      { key: "hero_video_url", label: "Video (Light mode)", accept: "video/mp4,video/webm", type: "video" as const },
      { key: "hero_video_url_dark", label: "Video (Dark mode)", accept: "video/mp4,video/webm", type: "video" as const },
    ],
  },
  {
    title: "Jins tanlash rasmlari",
    icon: ImageIcon,
    items: [
      { key: "hero_girls_image_light", label: "Qiz bola (Light mode)", accept: "image/*", type: "image" as const },
      { key: "hero_girls_image_dark", label: "Qiz bola (Dark mode)", accept: "image/*", type: "image" as const },
      { key: "hero_boys_image_light", label: "O'g'il bola (Light mode)", accept: "image/*", type: "image" as const },
      { key: "hero_boys_image_dark", label: "O'g'il bola (Dark mode)", accept: "image/*", type: "image" as const },
    ],
  },
  {
    title: "Logotiplar",
    icon: ImageIcon,
    items: [
      { key: "logo_header", label: "Logotip (shapka)", accept: "image/*", type: "image" as const },
      { key: "logo_footer", label: "Logotip (futer)", accept: "image/*", type: "image" as const },
      { key: "logo_favicon", label: "Favicon", accept: "image/*", type: "image" as const },
    ],
  },
];

function FileUploadCard({
  field,
  label,
  accept,
  type,
  currentUrl,
  onUploaded,
}: {
  field: string;
  label: string;
  accept: string;
  type: "image" | "video";
  currentUrl: string;
  onUploaded: (field: string, url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("field", field);
      formData.append("file", file);
      const res = await apiPost<{ field: string; url: string }>("/settings/upload", formData);
      onUploaded(field, res.url);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Yuklashda xatolik";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    onUploaded(field, "");
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</label>

      {currentUrl ? (
        <div className="relative rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
          <div className="flex items-center gap-3">
            {type === "image" ? (
              <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-md bg-white dark:bg-neutral-700 sm:h-16 sm:w-24">
                <img src={currentUrl} alt={label} className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="flex h-14 w-20 flex-shrink-0 items-center justify-center rounded-md bg-neutral-200 dark:bg-neutral-700 sm:h-16 sm:w-24">
                <Video className="h-6 w-6 text-neutral-500" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{currentUrl}</p>
            </div>
            <div className="flex flex-shrink-0 gap-2">
              <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                aria-label="Almashtirish"
                className="rounded-md bg-primary-50 p-2.5 sm:p-2 text-primary-600 transition-colors hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </button>
              <button
                onClick={handleClear}
                aria-label="O'chirish"
                className="rounded-md bg-red-50 p-2.5 sm:p-2 text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-sm text-neutral-500 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-primary-600 dark:hover:bg-primary-900/20"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Upload className="h-5 w-5" />
          )}
          {uploading ? "Yuklanmoqda..." : "Fayl yuklash"}
        </button>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    apiGet<SiteSettings>("/settings/site")
      .then((data) => setSettings(data))
      .catch(() => setMessage({ type: "error", text: "Sozlamalarni yuklashda xatolik" }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await apiPut<SiteSettings>("/settings/site", settings);
      setSettings(updated);
      setMessage({ type: "success", text: "Sozlamalar saqlandi" });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: "error", text: "Saqlashda xatolik" });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: string, value: string) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-center text-red-600 dark:bg-red-900/20 dark:text-red-400">
        Sayt sozlamalarini yuklashda xatolik
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Sayt sozlamalari</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Kontaktlar, media, logotiplar va matnli kontentni boshqarish
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Saqlash
        </button>
      </div>

      {message && (
        <div
          className={cn(
            "rounded-lg px-4 py-3 text-sm font-medium",
            message.type === "success"
              ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          )}
        >
          {message.text}
        </div>
      )}

      {/* Upload sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {UPLOAD_FIELDS.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.title}
              className="min-w-0 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900 sm:p-6"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
                  <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{section.title}</h2>
              </div>
              <div className="space-y-4">
                {section.items.map((item) => (
                  <FileUploadCard
                    key={item.key}
                    field={item.key}
                    label={item.label}
                    accept={item.accept}
                    type={item.type}
                    currentUrl={(settings as unknown as Record<string, string>)[item.key] || ""}
                    onUploaded={updateField}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Text settings sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {TEXT_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.title}
              className="min-w-0 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900 sm:p-6"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
                  <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{section.title}</h2>
              </div>

              <div className="space-y-4">
                {section.fields.map((field) => (
                  <div key={field.key}>
                    <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {field.label}
                    </label>
                    {"multiline" in field && field.multiline ? (
                      <textarea
                        value={(settings as unknown as Record<string, string>)[field.key] || ""}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={(settings as unknown as Record<string, string>)[field.key] || ""}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <TrustBadgesSection
        badges={settings.trust_badges ?? []}
        onChange={(trust_badges) => setSettings((prev) => (prev ? { ...prev, trust_badges } : prev))}
      />

      <ResetDataSection />

      {/* Phones: keep the save button reachable on this long page */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95 sm:hidden">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Saqlash
        </button>
      </div>
    </div>
  );
}

const INPUT =
  "h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-500";

function TrustBadgesSection({ badges, onChange }: { badges: TrustBadge[]; onChange: (b: TrustBadge[]) => void }) {
  const patch = (i: number, p: Partial<TrustBadge>) => onChange(badges.map((b, j) => (j === i ? { ...b, ...p } : b)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= badges.length) return;
    const next = [...badges];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="min-w-0 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
            <BadgeCheck className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Mahsulot sahifasidagi afzalliklar</h2>
            <p className="text-xs text-neutral-500">
              &quot;Bepul yetkazib berish&quot;, &quot;14 kun ichida qaytarish&quot; kabi belgilar. O&apos;chirilganlari saytda ko&apos;rinmaydi.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange([...badges, { icon: "shield", title_uz: "", title_ru: "", enabled: true }])}
          disabled={badges.length >= 6}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-primary-200 px-3 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 disabled:opacity-40 dark:border-primary-900/50 dark:text-primary-400"
        >
          <Plus className="h-4 w-4" /> Qo&apos;shish
        </button>
      </div>

      {badges.length === 0 && (
        <p className="rounded-lg bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500 dark:bg-neutral-800">
          Afzalliklar yo&apos;q — mahsulot sahifasida bu blok ko&apos;rinmaydi.
        </p>
      )}

      <div className="space-y-3">
        {badges.map((b, i) => {
          const Icon = (TRUST_ICONS[b.icon] ?? TRUST_ICONS.shield).icon;
          return (
            <div
              key={i}
              className={cn(
                "rounded-lg border border-neutral-200 p-3 dark:border-neutral-700",
                !b.enabled && "opacity-60"
              )}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[auto_1fr_1fr_auto] md:items-end">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-500">Belgi</label>
                  <div className="flex items-center gap-2">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary-50 dark:bg-secondary-950/30">
                      <Icon className="h-5 w-5 text-secondary-600" />
                    </span>
                    <select
                      value={b.icon}
                      onChange={(e) => patch(i, { icon: e.target.value })}
                      className={cn(INPUT, "w-full md:w-32")}
                    >
                      {Object.entries(TRUST_ICONS).map(([key, v]) => (
                        <option key={key} value={key}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-500">Matn (o&apos;zbekcha)</label>
                  <input className={INPUT} value={b.title_uz} maxLength={80} placeholder="Bepul yetkazib berish"
                    onChange={(e) => patch(i, { title_uz: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-500">Matn (ruscha)</label>
                  <input className={INPUT} value={b.title_ru} maxLength={80} placeholder="Бесплатная доставка"
                    onChange={(e) => patch(i, { title_ru: e.target.value })} />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="mr-1 flex cursor-pointer items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                    <input type="checkbox" checked={b.enabled} onChange={(e) => patch(i, { enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-200" />
                    Faol
                  </label>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Yuqoriga"
                    className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === badges.length - 1} aria-label="Pastga"
                    className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => onChange(badges.filter((_, j) => j !== i))} aria-label="O'chirish"
                    className="rounded-md p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-neutral-500">O&apos;zgarishlar yuqoridagi &quot;Saqlash&quot; tugmasi bilan saqlanadi.</p>
    </div>
  );
}

function ResetDataSection() {
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    const first = confirm(
      "DIQQAT! Barcha mahsulotlar, buyurtmalar, to'lovlar va statistikalar o'chiriladi. Kategoriyalar, brendlar va foydalanuvchilar qoladi. Davom etasizmi?"
    );
    if (!first) return;
    const second = confirm(
      "Bu amalni qaytarib bo'lmaydi! Haqiqatan ham barcha ma'lumotlarni tozalamoqchimisiz?"
    );
    if (!second) return;

    setResetting(true);
    try {
      await apiPost("/settings/reset-all-data");
      toast.success("Barcha ma'lumotlar tozalandi");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Xatolik yuz berdi");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-red-200 bg-red-50/50 p-4 sm:p-6 dark:border-red-900/50 dark:bg-red-900/10">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">
            Ma'lumotlarni tozalash
          </h2>
          <p className="mt-1 text-sm text-red-600/80 dark:text-red-400/80">
            Barcha mahsulotlar, buyurtmalar, to'lovlar, savatlar, sevimlilar va statistikalarni o'chiradi.
            Kategoriyalar, brendlar, bannerlar va foydalanuvchilar saqlanadi.
          </p>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="mt-4 flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {resetting ? "Tozalanmoqda..." : "Hammasini tozalash"}
          </button>
        </div>
      </div>
    </div>
  );
}
