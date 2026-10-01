"use client";

export const dynamic = "force-dynamic";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, User, Phone, Sparkles, Check, X } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { getDeferredAction, clearDeferredAction } from "@/store/deferred-action";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/use-translation";
import type { TranslationKeys } from "@/lib/i18n";
import toast from "react-hot-toast";
import { LocationPicker } from "@/components/ui/location-picker";

const createRegisterSchema = (t: TranslationKeys) =>
  z
    .object({
      first_name: z.string().min(2, t.authForms.validation.firstNameRequired),
      last_name: z.string().min(2, t.authForms.validation.lastNameRequired),
      email: z.string().email(t.auth.invalidEmail),
      phone: z.string().min(9, t.authForms.validation.phoneInvalid).optional(),
      password: z.string().min(8, t.authForms.validation.passwordMin8),
      confirm_password: z.string(),
      agree_terms: z.boolean().refine((val) => val === true, {
        message: t.authForms.validation.termsRequired,
      }),
    })
    .refine((data) => data.password === data.confirm_password, {
      message: t.auth.passwordMismatch,
      path: ["confirm_password"],
    });

type RegisterFormData = z.infer<ReturnType<typeof createRegisterSchema>>;

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslation();
  const registerSchema = useMemo(() => createRegisterSchema(t), [t]);
  const { register: registerUser, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch("password", "");

  const passwordStrength = {
    hasLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasLetter: /[a-zA-Z]/.test(password),
  };

  const strengthScore = Object.values(passwordStrength).filter(Boolean).length;

  const addItem = useCartStore((s) => s.addItem);

  const onSubmit = async (data: RegisterFormData) => {
    setServerError("");
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        city,
        address,
        latitude: coords?.lat,
        longitude: coords?.lon,
      });

      const deferred = getDeferredAction();
      if (deferred) {
        clearDeferredAction();
        if (deferred.type === "favorite") {
          apiPost(`/favorites/${deferred.productId}`).catch(() => {});
          toast.success(t.authForms.favoriteAdded);
          router.push(deferred.returnUrl);
          return;
        }
        if (deferred.type === "cart") {
          addItem(deferred.product, deferred.variant, deferred.quantity);
          router.push(deferred.returnUrl);
          return;
        }
      }

      router.push("/account");
    } catch (error) {
      const err = error as { response?: { data?: { detail?: string } } };
      setServerError(
        err.response?.data?.detail || t.authForms.registerError
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-12 dark:bg-neutral-950">
      <div className="relative w-full max-w-md">
        {/* Decorative Stars */}
        <div className="pointer-events-none absolute -left-8 -top-8 text-secondary-300 opacity-30">
          <Sparkles className="h-16 w-16" />
        </div>
        <div className="pointer-events-none absolute -bottom-8 -right-8 text-accent-300 opacity-30">
          <Sparkles className="h-12 w-12" />
        </div>

        {/* Register Card */}
        <div className="relative rounded-2xl border border-neutral-200 bg-white p-8 shadow-xl dark:border-neutral-700 dark:bg-neutral-900 lg:p-10">
          {/* Logo/Branding */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 font-display text-4xl text-charcoal dark:text-white">
              Velmora Kids
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {t.auth.registerSubtitle}
            </p>
          </div>

          {/* Server Error */}
          {serverError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              {serverError}
            </div>
          )}

          {/* Register Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t.auth.firstName}
                {...register("first_name")}
                error={errors.first_name?.message}
                placeholder={t.auth.firstName}
                icon={<User className="h-4 w-4" />}
              />
              <Input
                label={t.auth.lastName}
                {...register("last_name")}
                error={errors.last_name?.message}
                placeholder={t.auth.lastName}
                icon={<User className="h-4 w-4" />}
              />
            </div>

            <Input
              label={t.auth.email}
              type="email"
              {...register("email")}
              error={errors.email?.message}
              placeholder="your@email.com"
              icon={<Mail className="h-4 w-4" />}
            />

            <Input
              label={t.auth.phone}
              type="tel"
              {...register("phone")}
              error={errors.phone?.message}
              placeholder="+998 90 123 45 67"
              icon={<Phone className="h-4 w-4" />}
            />

            <div className="relative">
              <Input
                label={t.auth.password}
                type={showPassword ? "text" : "password"}
                {...register("password")}
                error={errors.password?.message}
                placeholder={t.auth.passwordMin}
                icon={<Lock className="h-4 w-4" />}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-[30px] flex h-10 w-10 items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i < strengthScore
                          ? strengthScore === 1
                            ? "bg-red-500"
                            : strengthScore === 2
                            ? "bg-amber-500"
                            : "bg-secondary-500"
                          : "bg-neutral-200 dark:bg-neutral-700"
                      }`}
                    />
                  ))}
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    {passwordStrength.hasLength ? (
                      <Check className="h-3 w-3 text-secondary-600" />
                    ) : (
                      <X className="h-3 w-3 text-neutral-400" />
                    )}
                    <span
                      className={
                        passwordStrength.hasLength
                          ? "text-secondary-700 dark:text-secondary-400"
                          : "text-neutral-500"
                      }
                    >
                      {t.authForms.strength.minLength}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordStrength.hasNumber ? (
                      <Check className="h-3 w-3 text-secondary-600" />
                    ) : (
                      <X className="h-3 w-3 text-neutral-400" />
                    )}
                    <span
                      className={
                        passwordStrength.hasNumber
                          ? "text-secondary-700 dark:text-secondary-400"
                          : "text-neutral-500"
                      }
                    >
                      {t.authForms.strength.hasNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordStrength.hasLetter ? (
                      <Check className="h-3 w-3 text-secondary-600" />
                    ) : (
                      <X className="h-3 w-3 text-neutral-400" />
                    )}
                    <span
                      className={
                        passwordStrength.hasLetter
                          ? "text-secondary-700 dark:text-secondary-400"
                          : "text-neutral-500"
                      }
                    >
                      {t.authForms.strength.hasLetter}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="relative">
              <Input
                label={t.auth.confirmPassword}
                type={showConfirmPassword ? "text" : "password"}
                {...register("confirm_password")}
                error={errors.confirm_password?.message}
                placeholder={t.auth.confirmPassword}
                icon={<Lock className="h-4 w-4" />}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-1 top-[30px] flex h-10 w-10 items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t.authForms.addressOptional}</p>
              <LocationPicker 
                onAddressChange={(newAddress, newCity) => {
                  setAddress(newAddress);
                  setCity(newCity);
                }}
                onLocationChange={(lat, lon) => setCoords({ lat, lon })}
              />
            </div>

            {/* Terms Agreement */}
            <div>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  {...register("agree_terms")}
                  className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-400"
                />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {t.authForms.agreeBefore && `${t.authForms.agreeBefore} `}
                  <span className="text-primary-600">
                    {t.authForms.agreeTerms}
                  </span>{" "}
                  {t.authForms.agreeAnd}{" "}
                  <span className="text-primary-600">
                    {t.authForms.agreePrivacy}
                  </span>
                  {t.authForms.agreeAfter && ` ${t.authForms.agreeAfter}`}
                </span>
              </label>
              {errors.agree_terms && (
                <p className="mt-1.5 text-xs text-red-500">
                  {errors.agree_terms.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              {isLoading ? t.auth.registering : t.auth.register}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
            <span className="text-sm text-neutral-500">{t.auth.or}</span>
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {t.auth.haveAccount}{" "}
              <Link
                href="/auth/login"
                className="font-medium text-primary-600 hover:underline"
              >
                {t.auth.loginLink}
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-charcoal dark:hover:text-white hover:underline"
          >
            {t.auth.backToHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
