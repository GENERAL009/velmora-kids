"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
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

interface SiteSettings {
  payment_card_number?: string;
  payment_card_holder?: string;
  payment_card_bank?: string;
  delivery_fee_courier?: number;
  [key: string]: unknown;
}

const checkoutSchema = z.object({
  first_name: z.string().min(2, "Введите имя"),
  last_name: z.string().min(2, "Введите фамилию"),
  phone: z.string().min(9, "Введите корректный номер телефона"),
  email: z.string().email("Введите корректный email").optional().or(z.literal("")),
  city: z.string().min(2, "Выберите город"),
  address: z.string().min(10, "Введите полный адрес"),
  delivery_method: z.enum(["pickup", "courier"]),
  payment_method: z.enum(["cash", "card_transfer"]),
  comment: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

const CITIES = [
  "Ташкент",
  "Самарканд",
  "Бухара",
  "Андижан",
  "Наманган",
  "Фергана",
  "Нукус",
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotal, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [copied, setCopied] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
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
        setUploadError("Файл слишком большой (макс 5MB)");
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
      city: "Ташкент",
      delivery_method: "courier",
      payment_method: "cash",
    },
  });

  const deliveryMethod = watch("delivery_method");

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
      setErrorMessage("Пожалуйста, загрузите чек об оплате");
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
      setErrorMessage(err.response?.data?.detail || "Произошла ошибка. Попробуйте снова.");
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
              { step: 1, label: "Данные" },
              { step: 2, label: "Доставка" },
              { step: 3, label: "Оплата" },
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
                    1. Контактные данные
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Имя"
                      {...register("first_name")}
                      error={errors.first_name?.message}
                      placeholder="Введите ваше имя"
                    />
                    <Input
                      label="Фамилия"
                      {...register("last_name")}
                      error={errors.last_name?.message}
                      placeholder="Введите вашу фамилию"
                    />
                    <Input
                      label="Телефон"
                      {...register("phone")}
                      error={errors.phone?.message}
                      placeholder="+998 90 123 45 67"
                    />
                    <Input
                      label="Email (необязательно)"
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
                    2. Доставка
                  </h2>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          Город
                        </label>
                        <select
                          {...register("city")}
                          className="h-11 w-full rounded border border-neutral-200 bg-white px-4 text-sm text-neutral-900 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-primary-600 dark:focus:ring-primary-900"
                        >
                          {CITIES.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
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
                        Локация на карте
                      </label>
                      <LocationPicker 
                        onAddressChange={(address, city) => {
                          setValue("address", address, { shouldValidate: true });
                          setValue("city", city, { shouldValidate: true });
                        }}
                        onLocationChange={(lat, lon) => setCoords({ lat, lon })}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 mt-4 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Адрес доставки (ориентир, подъезд)
                      </label>
                      <textarea
                        {...register("address")}
                        rows={3}
                        placeholder="Улица, дом, квартира"
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
                        Способ доставки
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
                            <div className="font-medium text-charcoal dark:text-neutral-100">Самовывоз</div>
                            <div className="text-xs text-neutral-500">Бесплатно</div>
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
                            <div className="font-medium text-charcoal dark:text-neutral-100">Курьер</div>
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
                    3. Оплата
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
                          <span className="font-medium text-charcoal dark:text-white">Перевод на карту</span>
                          <div className="rounded bg-gradient-to-r from-blue-600 to-blue-800 px-3 py-1 text-xs font-bold text-white">
                            UZCARD / HUMO
                          </div>
                        </div>
                        <div className="text-xs text-neutral-500 mt-1 mb-4">
                          Переведите на нашу карту и загрузите чек для подтверждения
                        </div>
                        
                        {paymentMethod === "card_transfer" && (
                          <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                            {cardNumber && (
                              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                                <div className="flex flex-col gap-2 bg-white dark:bg-neutral-800 p-3 rounded-md mb-2 border border-neutral-100 dark:border-neutral-700 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="min-w-0">
                                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Номер карты ({cardBank})</p>
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
                                    {copied ? "Скопировано!" : "Копировать"}
                                  </button>
                                </div>
                                {cardHolder && (
                                  <p className="text-xs text-blue-800 dark:text-blue-300">
                                    <span className="font-medium">Получатель:</span> {cardHolder}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Receipt Upload Box directly under Card Number */}
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                                Чек об оплате <span className="text-red-500">*</span>
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
                                        Загрузить квитанцию / чек
                                      </p>
                                      <p className="text-xs text-neutral-500 mt-0.5">
                                        Нажмите для выбора файла (PNG, JPG до 5 MB)
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
                                          {(file.size / (1024 * 1024)).toFixed(2)} MB • Чек прикреплен
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
                                      title="Удалить файл"
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
                        <span className="font-medium text-charcoal dark:text-white">Наличные</span>
                        <div className="text-xs text-neutral-500">
                          Оплата при получении
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="mt-4">
                    <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Комментарий к заказу (необязательно)
                    </label>
                    <textarea
                      {...register("comment")}
                      rows={3}
                      placeholder="Укажите пожелания к заказу"
                      className="w-full rounded border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus:ring-primary-900"
                    />
                  </div>
                </div>
              </div>

              {/* Order Summary Sidebar */}
              <div className="order-first lg:order-last lg:col-span-1">
                <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 p-4 shadow-sm sm:p-6 lg:sticky lg:top-24">
                  <h2 className="mb-4 font-display text-xl text-charcoal dark:text-white">
                    Ваш заказ
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
                        и еще {items.length - 3} товар(ов)
                      </p>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="space-y-2 border-b border-neutral-200 dark:border-neutral-700 pb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600 dark:text-neutral-400">Сумма товаров</span>
                      <span className="font-medium dark:text-neutral-200">{formatPrice(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-secondary-600">
                        <span>Скидка {storePromo && `(${storePromo})`}</span>
                        <span className="font-medium">-{formatPrice(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600 dark:text-neutral-400">Доставка</span>
                      <span className="font-medium dark:text-neutral-200">
                        {deliveryFee === 0 ? (
                          <span className="text-secondary-600">Бесплатно</span>
                        ) : (
                          formatPrice(deliveryFee)
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="py-4">
                    <div className="flex justify-between">
                      <span className="font-display text-lg text-charcoal dark:text-white">Всего</span>
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
                    {isSubmitting ? "Оформление..." : "Подтвердить заказ"}
                  </Button>

                  {errorMessage && (
                    <div className="mt-3 rounded-md bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-600 dark:text-red-400">
                      {errorMessage}
                    </div>
                  )}

                  <p className="mt-4 text-center text-xs text-neutral-500">
                    Нажимая на кнопку, вы соглашаетесь с{" "}
                    <span className="text-primary-600">
                      условиями обработки данных
                    </span>
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
