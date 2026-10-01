"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { ShoppingBag, Copy, UploadCloud, CheckCircle2 } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import api, { apiGet, apiPost } from "@/lib/api";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { LocationPicker } from "@/components/ui/location-picker";
import { useAddresses, type SavedAddress } from "@/hooks/use-account";
import { useTranslation } from "@/hooks/use-translation";
import { getTranslations } from "@/lib/i18n";

interface SiteSettings {
  payment_card_number?: string;
  payment_card_holder?: string;
  payment_card_bank?: string;
  delivery_fee_courier?: number;
  [key: string]: unknown;
}

const createCheckoutSchema = (t: ReturnType<typeof getTranslations>) =>
  z.object({
    first_name: z.string().min(2, t.checkoutPage.validation.firstNameRequired),
    last_name: z.string().min(2, t.checkoutPage.validation.lastNameRequired),
    phone: z.string().min(9, t.checkoutPage.validation.phoneInvalid),
    email: z.string().email(t.auth.invalidEmail).optional().or(z.literal("")),
    city: z.string().min(2, t.checkoutPage.validation.cityRequired),
    address: z.string().min(10, t.checkoutPage.validation.addressFull),
    delivery_method: z.enum(["pickup", "courier"]),
    payment_method: z.enum(["cash", "card_transfer"]),
    comment: z.string().optional(),
  });

type CheckoutFormData = z.infer<ReturnType<typeof createCheckoutSchema>>;

const CITY_KEYS = [
  "tashkent",
  "samarkand",
  "bukhara",
  "andijan",
  "namangan",
  "fergana",
  "nukus",
] as const;

const ALL_LOCALE_TRANSLATIONS = [getTranslations("ru"), getTranslations("uz")];

export default function CheckoutPage() {
  const router = useRouter();
  const t = useTranslation();
  const checkoutSchema = useMemo(() => createCheckoutSchema(t), [t]);
  const cities = CITY_KEYS.map((key) => t.checkoutPage.cities[key]);
  const { items, getTotal, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [copied, setCopied] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isNavigating = useRef(false);

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => apiGet<SiteSettings>("/settings/site"),
  });

  const cardNumber = settings?.payment_card_number || process.env.NEXT_PUBLIC_PAYMENT_CARD_NUMBER;
  const cardBank = settings?.payment_card_bank || "Uzcard";
  const cardHolder = settings?.payment_card_holder || "";

  const copyCard = () => {
    if (cardNumber) {
      navigator.clipboard.writeText(cardNumber.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        setUploadError(t.checkoutPage.fileTooLarge);
        return;
      }
      setFile(selectedFile);
      setUploadError("");
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      phone: user?.phone || "",
      email: user?.email || "",
      city: t.checkoutPage.cities.tashkent,
      delivery_method: "courier",
      payment_method: "cash",
    },
  });

  const deliveryMethod = watch("delivery_method");
  const selectedCity = watch("city");

  // Saved addresses from the profile: one tap fills city, address and map point
  const { data: savedAddresses = [] } = useAddresses(!!user);
  const applySavedAddress = (addr: SavedAddress) => {
    setSelectedAddressId(addr.id);
    setValue("city", addr.city, { shouldValidate: true });
    setValue("address", addr.address, { shouldValidate: true });
    setCoords(addr.latitude != null && addr.longitude != null ? { lat: addr.latitude, lon: addr.longitude } : null);
    setMapKey((k) => k + 1);
  };
  const appliedDefault = useRef(false);
  useEffect(() => {
    if (appliedDefault.current || savedAddresses.length === 0) return;
    appliedDefault.current = true;
    applySavedAddress(savedAddresses.find((a) => a.is_default) ?? savedAddresses[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAddresses]);

  // Keep the selected city in sync with the interface language
  useEffect(() => {
    const key = CITY_KEYS.find((k) =>
      ALL_LOCALE_TRANSLATIONS.some((tr) => tr.checkoutPage.cities[k] === selectedCity)
    );
    if (key && t.checkoutPage.cities[key] !== selectedCity) {
      setValue("city", t.checkoutPage.cities[key]);
    }
  }, [t, selectedCity, setValue]);

  useEffect(() => {
    if (items.length === 0 && !isNavigating.current) {
      router.push("/cart");
    }
  }, [items, router]);

  const { getDiscount, promoCode: storePromo } = useCartStore();
  const subtotal = getTotal();
  const discount = getDiscount();
  const courierFee = Number(settings?.delivery_fee_courier ?? 30000);
  const deliveryFee = deliveryMethod === "courier" ? courierFee : 0;
  const total = subtotal - discount + deliveryFee;

  const [errorMessage, setErrorMessage] = useState("");

  const paymentMethod = watch("payment_method");

  const onSubmit = async (formData: CheckoutFormData) => {
    if (formData.payment_method === "card_transfer" && !file) {
      setErrorMessage(t.checkoutPage.receiptRequired);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const orderPayload = {
        customer_first_name: formData.first_name,
        customer_last_name: formData.last_name,
        customer_phone: formData.phone,
        delivery_method: formData.delivery_method,
        delivery_city: formData.city,
        delivery_address: formData.address,
        payment_method: formData.payment_method,
        promo_code: storePromo || undefined,
        delivery_lat: formData.delivery_method === "courier" ? coords?.lat : undefined,
        delivery_lon: formData.delivery_method === "courier" ? coords?.lon : undefined,
        comment: formData.comment || undefined,
        items: items.map((item) => ({
          product_variant_id: item.variant.id,
          quantity: item.quantity,
        })),
      };

      const order = await apiPost<{ order_number: string; id: string }>("/orders", orderPayload);

      if (formData.payment_method === "card_transfer" && file) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        await api.post(
          `/payments/${order.id}/upload-receipt`,
          uploadFormData
        );
      }

      isNavigating.current = true;
      clearCart();
      router.push(`/checkout/success?order=${order.order_number}&id=${order.id}&method=${formData.payment_method}`);
    } catch (error) {
      const err = error as { response?: { data?: { detail?: string } } };
      setErrorMessage(err.response?.data?.detail || t.checkoutPage.genericError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-neutral-950">
      {/* Simplified Header */}
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="font-display text-2xl text-charcoal dark:text-white">
            Velmora Kids
          </Link>
        </div>
      </header>

      <main className="py-8 lg:py-12">
        <div className="container mx-auto px-4">
          {/* Steps Indicator */}
          <div className="mb-6 flex items-center justify-center gap-2 sm:mb-8 sm:gap-4">
            {[
              { step: 1, label: t.checkoutPage.steps.details },
              { step: 2, label: t.checkoutPage.steps.delivery },
              { step: 3, label: t.checkoutPage.steps.payment },
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className="flex items-center">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium bg-primary-500 text-white sm:h-8 sm:w-8 sm:text-sm">
                    {item.step}
                  </div>
                  <span className="ml-1.5 text-xs text-charcoal dark:text-white sm:ml-2 sm:text-sm">
                    {item.label}
                  </span>
                </div>
                {index < 2 && (
                  <div className="mx-1.5 h-0.5 w-6 bg-primary-500 sm:mx-2 sm:w-12 md:w-24" />
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Form Section */}
              <div className="space-y-6 lg:col-span-2">
                {/* Contact Information */}
                <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 p-4 shadow-sm sm:p-6">
                  <h2 className="mb-3 font-display text-lg text-charcoal dark:text-white sm:mb-4 sm:text-xl">
                    {t.checkoutPage.contactTitle}
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label={t.auth.firstName}
                      {...register("first_name")}
                      error={errors.first_name?.message}
                      placeholder={t.checkoutPage.firstNamePlaceholder}
                    />
                    <Input
                      label={t.auth.lastName}
                      {...register("last_name")}
                      error={errors.last_name?.message}
                      placeholder={t.checkoutPage.lastNamePlaceholder}
                    />
                    <Input
                      label={t.auth.phone}
                      {...register("phone")}
                      error={errors.phone?.message}
                      placeholder="+998 90 123 45 67"
                    />
                    <Input
                      label={t.checkoutPage.emailOptional}
                      {...register("email")}
                      error={errors.email?.message}
                      placeholder="email@example.com"
                      type="email"
                    />
                  </div>
                </div>

                {/* Delivery */}
                <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 p-4 shadow-sm sm:p-6">
                  <h2 className="mb-3 font-display text-lg text-charcoal dark:text-white sm:mb-4 sm:text-xl">
                    {t.checkoutPage.deliveryTitle}
                  </h2>
                  <div className="space-y-4">
                    {savedAddresses.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          {t.checkoutPage.savedAddresses}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {savedAddresses.map((addr) => (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => applySavedAddress(addr)}
                              className={`max-w-full rounded-full border px-3 py-1.5 text-left text-xs transition-colors sm:text-sm ${
                                selectedAddressId === addr.id
                                  ? "border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-950/30 dark:text-primary-300"
                                  : "border-neutral-200 text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-300"
                              }`}
                            >
                              <span className="font-medium">{addr.label}</span>
                              <span className="ml-1 text-neutral-500">· {addr.address.length > 32 ? `${addr.address.slice(0, 32)}…` : addr.address}</span>
                            </button>
                          ))}
                          <Link
                            href="/account/addresses"
                            className="rounded-full border border-dashed border-neutral-300 px-3 py-1.5 text-xs text-neutral-500 hover:text-primary-600 dark:border-neutral-600 sm:text-sm"
                          >
                            {t.checkoutPage.manageAddresses}
                          </Link>
                        </div>
                      </div>
                    )}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          {t.checkoutPage.city}
                        </label>
                        <select
                          {...register("city")}
                          className="h-11 w-full rounded border border-neutral-200 bg-white px-4 text-sm text-neutral-900 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-primary-600 dark:focus:ring-primary-900"
                        >
                          {cities.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                          {selectedCity && !cities.includes(selectedCity) && (
                            <option value={selectedCity}>{selectedCity}</option>
                          )}
                        </select>
                        {errors.city && (
                          <p className="mt-1.5 text-xs text-red-500">
                            {errors.city.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {t.checkoutPage.mapLocation}
                      </label>
                      <LocationPicker
                        key={mapKey}
                        initialAddress={watch("address")}
                        initialCoords={coords ? [coords.lat, coords.lon] : null}
                        onAddressChange={(address, city) => {
                          setValue("address", address, { shouldValidate: true });
                          setValue("city", city, { shouldValidate: true });
                        }}
                        onLocationChange={(lat, lon) => setCoords({ lat, lon })}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 mt-4 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {t.checkoutPage.addressLabel}
                      </label>
                      <textarea
                        {...register("address")}
                        rows={3}
                        placeholder={t.checkoutPage.addressPlaceholder}
                        className="w-full rounded border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus:ring-primary-900"
                      />
                      {errors.address && (
                        <p className="mt-1.5 text-xs text-red-500">
                          {errors.address.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-3 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {t.checkoutPage.deliveryMethod}
                      </label>
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-neutral-200 dark:border-neutral-700 p-4 transition-colors hover:border-primary-300">
                          <input
                            type="radio"
                            value="pickup"
                            {...register("delivery_method")}
                            className="h-4 w-4 text-primary-500"
                          />
                          <div>
                            <div className="font-medium text-charcoal dark:text-neutral-100">{t.checkoutPage.pickup}</div>
                            <div className="text-xs text-neutral-500">{t.cart.free}</div>
                          </div>
                        </label>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-neutral-200 dark:border-neutral-700 p-4 transition-colors hover:border-primary-300">
                          <input
                            type="radio"
                            value="courier"
                            {...register("delivery_method")}
                            className="h-4 w-4 text-primary-500"
                          />
                          <div>
                            <div className="font-medium text-charcoal dark:text-neutral-100">{t.checkoutPage.courier}</div>
                            <div className="text-xs text-neutral-500">
                              {formatPrice(30000)}
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment */}
                <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 p-4 shadow-sm sm:p-6">
                  <h2 className="mb-3 font-display text-lg text-charcoal dark:text-white sm:mb-4 sm:text-xl">
                    {t.checkoutPage.paymentTitle}
                  </h2>
                  <div className="space-y-3">
                    <label className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors ${paymentMethod === 'card_transfer' ? 'border-primary-400 bg-primary-50/50 dark:bg-primary-950/20' : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300'}`}>
                      <input
                        type="radio"
                        value="card_transfer"
                        {...register("payment_method")}
                        className="h-4 w-4 mt-1 text-primary-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-charcoal dark:text-white">{t.checkoutPage.cardTransfer}</span>
                          <div className="rounded bg-gradient-to-r from-blue-600 to-blue-800 px-3 py-1 text-xs font-bold text-white">
                            UZCARD / HUMO
                          </div>
                        </div>
                        <div className="text-xs text-neutral-500 mt-1 mb-4">
                          {t.checkoutPage.cardTransferHint}
                        </div>
                        
                        {paymentMethod === "card_transfer" && (
                          <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                            {cardNumber && (
                              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                                <div className="flex flex-col gap-2 bg-white dark:bg-neutral-800 p-3 rounded-md mb-2 border border-neutral-100 dark:border-neutral-700 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="min-w-0">
                                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">{t.checkoutPage.cardNumber.replace("{bank}", cardBank)}</p>
                                    <p className="text-sm font-mono font-bold tracking-wider text-charcoal dark:text-white sm:text-base">
                                      {cardNumber}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      copyCard();
                                    }}
                                    className="flex h-10 flex-shrink-0 items-center gap-1.5 self-start rounded-md bg-blue-100 px-3 text-xs font-medium text-blue-700 hover:bg-blue-200 transition-colors"
                                  >
                                    <Copy className="h-3 w-3" />
                                    {copied ? t.checkoutPage.copied : t.checkoutPage.copy}
                                  </button>
                                </div>
                                {cardHolder && (
                                  <p className="text-xs text-blue-800 dark:text-blue-300">
                                    <span className="font-medium">{t.checkoutPage.recipient}</span> {cardHolder}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Receipt Upload Box directly under Card Number */}
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                                {t.checkoutPage.receipt} <span className="text-red-500">*</span>
                              </label>
                              <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`group relative rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all duration-200 ${
                                  file 
                                    ? "border-emerald-400 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/20" 
                                    : "border-neutral-300 bg-neutral-50/50 hover:border-primary-400 hover:bg-white dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-primary-500"
                                }`}
                              >
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  ref={fileInputRef}
                                  onChange={handleFileChange}
                                />
                                {!file ? (
                                  <div className="space-y-2 py-1">
                                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 group-hover:scale-110 transition-transform">
                                      <UploadCloud className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-charcoal dark:text-white">
                                        {t.checkoutPage.uploadReceipt}
                                      </p>
                                      <p className="text-xs text-neutral-500 mt-0.5">
                                        {t.checkoutPage.uploadHint}
                                      </p>
                                    </div>
                                    {uploadError && <p className="text-xs text-red-500 font-medium">{uploadError}</p>}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between p-2 bg-white dark:bg-neutral-800 rounded-lg border border-emerald-200 dark:border-emerald-800 shadow-sm" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-3 overflow-hidden">
                                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600">
                                        <CheckCircle2 className="h-5 w-5" />
                                      </div>
                                      <div className="text-left overflow-hidden">
                                        <p className="text-xs font-semibold text-charcoal dark:text-white truncate">
                                          {file.name}
                                        </p>
                                        <p className="text-[10px] text-emerald-600 font-medium">
                                          {(file.size / (1024 * 1024)).toFixed(2)} MB • {t.checkoutPage.receiptAttached}
                                        </p>
                                      </div>
                                    </div>
                                    <button 
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFile(null);
                                      }}
                                      className="h-9 w-9 flex items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-red-500 dark:hover:bg-neutral-700 transition-colors"
                                      title={t.checkoutPage.removeFile}
                                      aria-label={t.checkoutPage.removeFile}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </label>

                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-neutral-200 dark:border-neutral-700 p-4 transition-colors hover:border-primary-300">
                      <input
                        type="radio"
                        value="cash"
                        {...register("payment_method")}
                        className="h-4 w-4 text-primary-500"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-charcoal dark:text-white">{t.checkoutPage.cash}</span>
                        <div className="text-xs text-neutral-500">
                          {t.checkoutPage.cashHint}
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="mt-4">
                    <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {t.checkoutPage.comment}
                    </label>
                    <textarea
                      {...register("comment")}
                      rows={3}
                      placeholder={t.checkoutPage.commentPlaceholder}
                      className="w-full rounded border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus:ring-primary-900"
                    />
                  </div>
                </div>
              </div>

              {/* Order Summary Sidebar */}
              <div className="order-first lg:order-last lg:col-span-1">
                <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 p-4 shadow-sm sm:p-6 lg:sticky lg:top-24">
                  <h2 className="mb-4 font-display text-xl text-charcoal dark:text-white">
                    {t.checkoutPage.yourOrder}
                  </h2>

                  {/* Items Mini List */}
                  <div className="mb-4 space-y-3 border-b border-neutral-200 dark:border-neutral-700 pb-4">
                    {items.slice(0, 3).map((item) => {
                      const price = item.product.price + (item.variant.additional_price ?? 0);
                      return (
                        <div key={item.variant.id} className="flex gap-3">
                          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-primary-100 to-secondary-100">
                            {item.product.images?.[0]?.file_path ? (
                              <Image
                                src={item.product.images[0].file_path}
                                alt={item.product.name}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <ShoppingBag className="h-6 w-6 text-primary-300" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-charcoal dark:text-white line-clamp-1">
                              {item.product.name}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {item.variant.color.name}
                            </p>
                            <p className="text-sm font-medium text-charcoal dark:text-white">
                              {item.quantity} × {formatPrice(price)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {items.length > 3 && (
                      <p className="text-xs text-neutral-500">
                        {t.checkoutPage.moreItems.replace("{count}", String(items.length - 3))}
                      </p>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="space-y-2 border-b border-neutral-200 dark:border-neutral-700 pb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600 dark:text-neutral-400">{t.cart.subtotal}</span>
                      <span className="font-medium dark:text-neutral-200">{formatPrice(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-secondary-600">
                        <span>{t.cart.discount} {storePromo && `(${storePromo})`}</span>
                        <span className="font-medium">-{formatPrice(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600 dark:text-neutral-400">{t.cart.delivery}</span>
                      <span className="font-medium dark:text-neutral-200">
                        {deliveryFee === 0 ? (
                          <span className="text-secondary-600">{t.cart.free}</span>
                        ) : (
                          formatPrice(deliveryFee)
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="py-4">
                    <div className="flex justify-between">
                      <span className="font-display text-lg text-charcoal dark:text-white">{t.cart.total}</span>
                      <span className="font-display text-2xl font-semibold text-charcoal dark:text-white">
                        {formatPrice(total)}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    isLoading={isSubmitting}
                  >
                    {isSubmitting ? t.checkoutPage.submitting : t.checkoutPage.confirmOrder}
                  </Button>

                  {errorMessage && (
                    <div className="mt-3 rounded-md bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-600 dark:text-red-400">
                      {errorMessage}
                    </div>
                  )}

                  <p className="mt-4 text-center text-xs text-neutral-500">
                    {t.checkoutPage.agreeBefore}{" "}
                    <span className="text-primary-600">
                      {t.checkoutPage.agreeLink}
                    </span>
                    {t.checkoutPage.agreeAfter && ` ${t.checkoutPage.agreeAfter}`}
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
