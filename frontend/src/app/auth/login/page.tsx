"use client";

export const dynamic = "force-dynamic";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { getDeferredAction, clearDeferredAction } from "@/store/deferred-action";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/use-translation";
import type { TranslationKeys } from "@/lib/i18n";
import toast from "react-hot-toast";

const createLoginSchema = (t: TranslationKeys) =>
  z.object({
    email: z.string().email(t.auth.invalidEmail),
    password: z.string().min(6, t.auth.passwordMin),
  });

type LoginFormData = z.infer<ReturnType<typeof createLoginSchema>>;

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslation();
  const loginSchema = useMemo(() => createLoginSchema(t), [t]);
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const addItem = useCartStore((s) => s.addItem);

  const onSubmit = async (data: LoginFormData) => {
    setServerError("");
    try {
      await login(data.email, data.password);

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
        err.response?.data?.detail || t.auth.invalidCredentials
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-12 dark:bg-neutral-950">
      <div className="relative w-full max-w-md">
        {/* Decorative Stars */}
        <div className="pointer-events-none absolute -left-8 -top-8 text-accent-300 opacity-30">
          <Sparkles className="h-16 w-16" />
        </div>
        <div className="pointer-events-none absolute -bottom-8 -right-8 text-primary-300 opacity-30">
          <Sparkles className="h-12 w-12" />
        </div>

        {/* Login Card */}
        <div className="relative rounded-2xl border border-neutral-200 bg-white p-8 shadow-xl dark:border-neutral-700 dark:bg-neutral-900 lg:p-10">
          {/* Logo/Branding */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 font-display text-3xl text-charcoal dark:text-white sm:text-4xl">
              Velmora Kids
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {t.auth.loginTitle}
            </p>
          </div>

          {/* Server Error */}
          {serverError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              {serverError}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label={t.auth.email}
              type="email"
              {...register("email")}
              error={errors.email?.message}
              placeholder="your@email.com"
              icon={<Mail className="h-4 w-4" />}
            />

            <div className="relative">
              <Input
                label={t.auth.password}
                type={showPassword ? "text" : "password"}
                {...register("password")}
                error={errors.password?.message}
                placeholder={t.auth.enterPassword}
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

            <div className="flex items-center justify-end text-sm">
              <Link
                href="/auth/forgot-password"
                className="text-primary-600 hover:underline"
              >
                {t.auth.forgotPassword}
              </Link>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              {isLoading ? t.auth.loggingIn : t.auth.login}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
            <span className="text-sm text-neutral-500">{t.auth.or}</span>
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {t.auth.noAccount}{" "}
              <Link
                href="/auth/register"
                className="font-medium text-primary-600 hover:underline"
              >
                {t.auth.createAccount}
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
