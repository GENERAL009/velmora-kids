"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiPost } from "@/lib/api";
import { useTranslation } from "@/hooks/use-translation";

export default function ForgotPasswordPage() {
  const t = useTranslation();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    try {
      await apiPost("/auth/forgot-password", { email });
    } catch {
      // always show success to prevent email enumeration
    }
    setIsLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-12 dark:bg-neutral-950">
      <div className="relative w-full max-w-md">
        <div className="pointer-events-none absolute -left-8 -top-8 text-accent-300 opacity-30">
          <Sparkles className="h-16 w-16" />
        </div>

        <div className="relative rounded-2xl border border-neutral-200 bg-white p-8 shadow-xl dark:border-neutral-700 dark:bg-neutral-900 lg:p-10">
          <div className="mb-8 text-center">
            <h1 className="mb-2 font-display text-3xl text-charcoal dark:text-white">
              {t.authForms.forgot.title}
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {t.authForms.forgot.subtitle}
            </p>
          </div>

          {submitted ? (
            <div className="text-center">
              <div className="mb-4 rounded-lg border border-secondary-200 bg-secondary-50 p-4 text-sm text-secondary-700 dark:border-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-400">
                {t.authForms.forgot.sent}
              </div>
              <Link href="/auth/login">
                <Button variant="outline" className="mt-4">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t.authForms.forgot.backToLogin}
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={t.auth.email}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                icon={<Mail className="h-4 w-4" />}
                required
              />
              <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
                {t.authForms.forgot.send}
              </Button>
              <div className="text-center">
                <Link href="/auth/login" className="text-sm text-primary-600 hover:underline">
                  <ArrowLeft className="mr-1 inline h-3 w-3" />
                  {t.authForms.forgot.backToLogin}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
