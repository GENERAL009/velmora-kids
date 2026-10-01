"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ShoppingBag,
  Package,
  XCircle,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  Receipt,
  Send,
  Sparkles,
  Lock,
  ArrowRight,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "@/hooks/use-translation";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useNotificationStore } from "@/store/notification";

interface PaymentStatus {
  status: "pending" | "completed" | "failed" | "suspicious";
  has_receipt: boolean;
  rejection_reason?: string;
  uploaded_at?: string;
}

// Payment verification animation — in the site's soft rose / sage / cream style
function PaymentVerificationAnimation({ hasReceipt }: { hasReceipt: boolean }) {
  const t = useTranslation();
  const w = t.paymentWait;
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = [w.messages.m1, w.messages.m2, w.messages.m3, w.messages.m4];

  useEffect(() => {
    const timer = setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
    const msgTimer = setInterval(() => setMessageIndex((i) => (i + 1) % 4), 4000);
    return () => {
      clearInterval(timer);
      clearInterval(msgTimer);
    };
  }, []);

  const mm = Math.floor(secondsElapsed / 60).toString().padStart(2, "0");
  const ss = (secondsElapsed % 60).toString().padStart(2, "0");

  // 1 = receipt uploaded, 2 = sent to admins, 3 = verification (current)
  const activeStep = hasReceipt ? 3 : 2;
  const steps = [
    { step: 1, icon: Receipt, title: w.steps.uploadedTitle, desc: w.steps.uploadedDesc },
    { step: 2, icon: Send, title: w.steps.sentTitle, desc: w.steps.sentDesc },
    { step: 3, icon: ShieldCheck, title: w.steps.verifyTitle, desc: w.steps.verifyDesc },
  ];

  return (
    <div className="w-full space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 via-cream to-accent-50 p-6 shadow-sm dark:border-primary-900/40 dark:from-neutral-900 dark:via-neutral-900 dark:to-primary-950/30 sm:p-8">
        {/* soft background blobs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-200/40 blur-3xl dark:bg-primary-700/20" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-secondary-200/50 blur-3xl dark:bg-secondary-700/10" />

        <div className="relative flex flex-col items-center text-center">
          {/* Emblem: breathing rings + orbiting dot around a shield */}
          <div className="relative mb-6 flex h-28 w-28 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-primary-200/50 animate-payment-breathe dark:bg-primary-800/30" />
            <span className="absolute inset-3 rounded-full bg-primary-100/80 animate-payment-breathe [animation-delay:600ms] dark:bg-primary-900/40" />
            <span className="absolute -inset-1 rounded-full border border-dashed border-primary-300/70 animate-[spin_14s_linear_infinite] dark:border-primary-700/60" />
            <span className="absolute inset-0 animate-payment-orbit">
              <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-400 shadow-[0_0_10px_rgba(217,173,90,0.8)]" />
            </span>
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-400 to-rose-400 shadow-lg shadow-primary-400/30">
              <ShieldCheck className="h-8 w-8 text-white" strokeWidth={1.75} />
            </div>
          </div>

          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-white/70 px-3 py-1 text-xs font-medium text-primary-700 backdrop-blur dark:border-primary-800 dark:bg-neutral-900/60 dark:text-primary-300">
            <Lock className="h-3.5 w-3.5" />
            {w.badge}
          </div>

          <p className="max-w-md text-sm text-neutral-600 dark:text-neutral-400">{w.subtitle}</p>

          {/* Indeterminate progress */}
          <div className="mt-6 w-full max-w-md">
            <div className="mb-1.5 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
                </span>
                {w.stepsTitle}
              </span>
              <span className="font-mono tabular-nums">
                {w.elapsed}: {mm}:{ss}
              </span>
            </div>
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-primary-100 dark:bg-neutral-800">
              <div className="absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-primary-300 via-rose-400 to-accent-400 animate-payment-progress" />
            </div>
          </div>

          {/* Rotating status message */}
          <div className="mt-4 h-10 w-full max-w-md overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={messageIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="text-sm text-neutral-600 dark:text-neutral-300"
              >
                {messages[messageIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/60 sm:p-5">
        <div className="relative space-y-1">
          {steps.map((item, idx) => {
            const isDone = item.step < activeStep;
            const isCurrent = item.step === activeStep;
            const Icon = item.icon;
            return (
              <div key={item.step} className="relative flex items-start gap-3 rounded-lg p-2.5">
                {idx < steps.length - 1 && (
                  <span
                    className={`absolute left-[26px] top-11 h-[calc(100%-28px)] w-px ${
                      isDone ? "bg-secondary-300 dark:bg-secondary-700" : "bg-neutral-200 dark:bg-neutral-700"
                    }`}
                  />
                )}
                <div
                  className={`relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                    isDone
                      ? "bg-secondary-500 text-white"
                      : isCurrent
                        ? "bg-primary-100 text-primary-600 ring-4 ring-primary-50 dark:bg-primary-900/50 dark:text-primary-300 dark:ring-primary-950/40"
                        : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Icon className={`h-4 w-4 ${isCurrent ? "animate-pulse" : ""}`} />}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold ${isDone || isCurrent ? "text-charcoal dark:text-white" : "text-neutral-500"}`}>
                      {item.title}
                    </p>
                    {isCurrent && (
                      <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
                        {w.inProgress}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SuccessContent() {
  const t = useTranslation();
  const w = t.paymentWait;
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") || "VK00000000";
  const orderId = searchParams.get("id");
  const paymentMethod = searchParams.get("method");
  
  const [animate, setAnimate] = useState(false);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);

  useEffect(() => {
    setAnimate(true);
  }, []);

  // Polling for payment status every 7 seconds
  const { data: paymentStatus } = useQuery({
    queryKey: ["payment-status", orderId],
    queryFn: () => apiGet<PaymentStatus>(`/payments/${orderId}/status`),
    enabled: !!orderId && paymentMethod === "card_transfer",
    refetchInterval: (query) => {
      const status = query.state?.data?.status;
      if (status === "completed" || status === "failed") return false;
      return 7000;
    },
  });

  useEffect(() => {
    if (paymentStatus?.status === "completed" || paymentStatus?.status === "failed" || paymentStatus?.status === "suspicious") {
      fetchUnreadCount();
    }
  }, [paymentStatus?.status, fetchUnreadCount]);

  return (
    <div className="min-h-screen bg-cream dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="font-display text-2xl text-charcoal dark:text-white">
            Velmora Kids
          </Link>
        </div>
      </header>

      <main className="flex items-center justify-center py-8 lg:py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-900 sm:p-10 relative overflow-hidden">
              
              {/* Confetti / Celebration background if completed */}
              {paymentStatus?.status === "completed" && (
                <div className="absolute inset-0 pointer-events-none flex justify-center">
                  <div className="w-full h-full absolute animate-[pulse_3s_ease-in-out_infinite] bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-teal-500/10 z-0" />
                </div>
              )}

              <div className="relative z-10">
                {/* Status Header Icon */}
                <div className="mb-6 flex justify-center">
                  {paymentStatus?.status === "completed" ? (
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-600 shadow-xl shadow-emerald-500/30 scale-110 transition-all duration-500 animate-[bounce_1s_ease-in-out]">
                      <CheckCircle2 className="h-12 w-12 text-white" />
                    </div>
                  ) : paymentStatus?.status === "failed" ? (
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-xl shadow-red-500/30">
                      <XCircle className="h-12 w-12 text-white" />
                    </div>
                  ) : paymentStatus?.status === "suspicious" ? (
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-xl shadow-amber-500/30 animate-pulse">
                      <ShieldAlert className="h-12 w-12 text-white" />
                    </div>
                  ) : paymentMethod === "card_transfer" ? (
                    // We render the dedicated Premium Payment Animation below
                    null
                  ) : (
                    <div
                      className={`relative transition-all duration-700 ${
                        animate ? "scale-100 opacity-100" : "scale-50 opacity-0"
                      }`}
                    >
                      <div className="absolute inset-0 animate-ping rounded-full bg-secondary-400 opacity-20" />
                      <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-secondary-400 to-secondary-600 shadow-lg">
                        <CheckCircle2 className="h-12 w-12 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Message Title */}
                <div className="mb-6 text-center">
                  <h1 className="mb-2 font-display text-2xl text-charcoal dark:text-white sm:text-3xl lg:text-4xl">
                    {paymentStatus?.status === "completed"
                      ? w.titles.completed
                      : paymentStatus?.status === "failed"
                        ? w.titles.failed
                        : paymentStatus?.status === "suspicious"
                          ? w.titles.suspicious
                          : paymentMethod === "card_transfer"
                            ? w.titles.processing
                            : w.titles.placed}
                  </h1>
                  <p className="text-base text-neutral-600 dark:text-neutral-400">
                    {w.orderLabel}{" "}
                    <span className="font-semibold font-mono text-charcoal dark:text-white bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
                      #{orderNumber}
                    </span>
                  </p>
                  {paymentMethod !== "card_transfer" && (
                    <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">{w.placedDesc}</p>
                  )}
                </div>

                {/* Card Transfer Payment States */}
                {paymentMethod === "card_transfer" && (
                  <div className="mb-8">
                    {paymentStatus?.status === "completed" ? (
                      <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/80 p-6 dark:border-emerald-800 dark:bg-emerald-950/30 text-center space-y-3 shadow-sm">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600">
                          <Sparkles className="h-6 w-6" />
                        </div>
                        <h3 className="font-display text-xl text-emerald-900 dark:text-emerald-200">
                          {w.completedTitle}
                        </h3>
                        <p className="text-sm text-emerald-800 dark:text-emerald-300 max-w-md mx-auto">
                          {w.completedDesc}
                        </p>
                      </div>
                    ) : paymentStatus?.status === "failed" ? (
                      <div className="rounded-2xl border-2 border-red-200 bg-red-50/90 p-6 dark:border-red-900 dark:bg-red-950/30 shadow-sm">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-semibold text-red-900 dark:text-red-200">{w.failedTitle}</h3>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                              {w.reason} <span className="font-medium">{paymentStatus.rejection_reason || w.defaultReason}</span>
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-3 font-medium">
                              {w.failedHint}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : paymentStatus?.status === "suspicious" ? (
                      <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/90 p-6 dark:border-amber-900 dark:bg-amber-950/30 text-center space-y-3 shadow-sm">
                        <p className="font-semibold text-amber-900 dark:text-amber-200">
                          {w.suspiciousTitle}
                        </p>
                        <p className="text-xs text-amber-800 dark:text-amber-300 max-w-md mx-auto">
                          {w.suspiciousDesc}
                        </p>
                      </div>
                    ) : (
                      <PaymentVerificationAnimation hasReceipt={paymentStatus?.has_receipt ?? true} />
                    )}
                  </div>
                )}

                {/* Navigation Action Buttons */}
                <div className="flex flex-col gap-3 sm:flex-row mt-6">
                  <Button 
                    size="lg" 
                    className="w-full group sm:flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium"
                    onClick={() => window.location.href = "/catalog"}
                  >
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    {w.continueShopping}
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="w-full group sm:flex-1 border-neutral-300 dark:border-neutral-700"
                    onClick={() => window.location.href = "/account/orders"}
                  >
                    <Package className="mr-2 h-5 w-5" />
                    {w.myOrders}
                    <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>

              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-cream dark:bg-neutral-950">
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
            <p className="text-neutral-600">…</p>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}

