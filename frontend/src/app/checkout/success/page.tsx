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
  Cpu, 
  Sparkles,
  Lock,
  ArrowRight
} from "lucide-react";
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

// Creative & Modern Payment Verification Animation Component
function PremiumPaymentAnimation() {
  const [activeStep, setActiveStep] = useState(2);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  const statusMessages = [
    "Бот отправил чек 2 администраторам...",
    "Сверка реквизитов и суммы платежа...",
    "Проверка отклика от Telegram бота...",
    "Заказ готовится к автоматическому подтверждению..."
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    const msgTimer = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % statusMessages.length);
    }, 3500);

    const stepTimer = setInterval(() => {
      setActiveStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(msgTimer);
      clearInterval(stepTimer);
    };
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full space-y-6">
      {/* Animated Visual Card & Scanner Box */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-2xl border border-indigo-500/30">
        
        {/* Dynamic Background Glow Rings */}
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl animate-pulse" />
        <div className="absolute -left-12 -bottom-12 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl animate-pulse" />
        
        {/* Scanning Beam (Laser Line) */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#38bdf8] animate-payment-scan" />

        <div className="relative z-10 flex flex-col items-center text-center">
          
          {/* Holographic Security Shield Radar */}
          <div className="relative mb-5 flex h-24 w-24 items-center justify-center">
            {/* Concentric Pulse Rings */}
            <div className="absolute inset-0 animate-ping rounded-full border border-cyan-400/40" />
            <div className="absolute -inset-2 animate-[spin_8s_linear_infinite] rounded-full border border-dashed border-indigo-400/30" />
            
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_25px_rgba(6,182,212,0.5)]">
              <ShieldCheck className="h-10 w-10 text-white animate-pulse" />
              <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold shadow">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-950/80 px-3.5 py-1 text-xs font-medium text-cyan-300 border border-cyan-500/30 mb-3">
            <Lock className="h-3.5 w-3.5 text-cyan-400" />
            <span>Защищенная верификация платежа</span>
          </div>

          <h3 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Проверка чека и оплаты
          </h3>

          <p className="mt-1 text-xs text-indigo-200/80 max-w-md">
            Администраторы получили ваш чек и подтверждают проведение транзакции.
          </p>

          {/* Animated Progress Shimmer Bar */}
          <div className="mt-5 w-full max-w-md">
            <div className="flex justify-between text-xs text-cyan-200/90 mb-1.5 font-mono">
              <span className="flex items-center gap-1">
                <Cpu className="h-3.5 w-3.5 text-cyan-400 animate-spin" />
                Обработка...
              </span>
              <span className="font-bold text-cyan-300">Время: {formatTimer(secondsElapsed)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800 border border-indigo-900">
              <div className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-400 animate-payment-shimmer shadow-[0_0_12px_#38bdf8]" style={{ width: "85%" }} />
            </div>
          </div>

          {/* Live Micro Status Ticker */}
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-900/90 px-4 py-2 text-xs text-cyan-300/90 border border-slate-800">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping flex-shrink-0" />
            <span className="italic font-medium transition-all duration-300">
              {statusMessages[currentMessageIndex]}
            </span>
          </div>

        </div>
      </div>

      {/* Step-by-Step Live Status Tracker */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 dark:border-neutral-800 dark:bg-neutral-900/60 p-4 sm:p-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4">
          Этапы обработки заказа
        </h4>

        <div className="space-y-3">
          {[
            { step: 1, icon: Receipt, title: "Чек загружен", desc: "Файл чека успешно прикреплен клиентом" },
            { step: 2, icon: Send, title: "Уведомление отправлено", desc: "Уведомление передано обеим администраторам в Telegram" },
            { step: 3, icon: ShieldCheck, title: "Сверка платежа", desc: "Подтверждение поступления средств на карту" },
          ].map((item) => {
            const isDone = item.step <= activeStep;
            const isCurrent = item.step === activeStep;
            const IconComp = item.icon;

            return (
              <div 
                key={item.step} 
                className={`flex items-start gap-3 rounded-lg p-3 transition-all ${
                  isCurrent 
                    ? "bg-white dark:bg-neutral-800 shadow-sm border border-blue-200 dark:border-blue-900/50" 
                    : "opacity-80"
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${
                  isDone 
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                    : "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
                }`}>
                  {isDone ? <CheckCircle2 className="h-5 w-5 text-white" /> : item.step}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${isDone ? "text-charcoal dark:text-white" : "text-neutral-500"}`}>
                      {item.title}
                    </p>
                    {isCurrent && (
                      <span className="inline-flex items-center rounded bg-blue-100 dark:bg-blue-950 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">
                        Выполняется
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 truncate mt-0.5">{item.desc}</p>
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
                      ? "Оплата подтверждена!" 
                      : paymentStatus?.status === "failed"
                        ? "Оплата отклонена"
                        : paymentStatus?.status === "suspicious"
                          ? "Дополнительная проверка"
                          : paymentMethod === "card_transfer"
                            ? "Обработка платежа"
                            : "Заказ успешно оформлен!"}
                  </h1>
                  <p className="text-base text-neutral-600 dark:text-neutral-400">
                    Заказ:{" "}
                    <span className="font-semibold font-mono text-charcoal dark:text-white bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
                      #{orderNumber}
                    </span>
                  </p>
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
                          Большое спасибо за заказ!
                        </h3>
                        <p className="text-sm text-emerald-800 dark:text-emerald-300 max-w-md mx-auto">
                          Ваш платеж полностью подтвержден администрацией. Товар передается на комплектацию и отправку.
                        </p>
                      </div>
                    ) : paymentStatus?.status === "failed" ? (
                      <div className="rounded-2xl border-2 border-red-200 bg-red-50/90 p-6 dark:border-red-900 dark:bg-red-950/30 shadow-sm">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-semibold text-red-900 dark:text-red-200">Чек отклонен администратором</h3>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                              Причина: <span className="font-medium">{paymentStatus.rejection_reason || "Не совпадает сумма или дата в чеке"}</span>
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-3 font-medium">
                              Пожалуйста, обратитесь в службу поддержки или попробуйте оформить заказ заново.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : paymentStatus?.status === "suspicious" ? (
                      <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/90 p-6 dark:border-amber-900 dark:bg-amber-950/30 text-center space-y-3 shadow-sm">
                        <p className="font-semibold text-amber-900 dark:text-amber-200">
                          Дополнительная проверка чека
                        </p>
                        <p className="text-xs text-amber-800 dark:text-amber-300 max-w-md mx-auto">
                          Наши менеджеры проводят повторную сверку документа. Пожалуйста, ожидайте короткое время.
                        </p>
                      </div>
                    ) : (
                      /* Creative Modern Payment Processing Animation */
                      <PremiumPaymentAnimation />
                    )}
                  </div>
                )}

                {/* Navigation Action Buttons */}
                <div className="flex flex-col gap-3 sm:flex-row mt-6">
                  <Button 
                    size="lg" 
                    className="w-full group flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium"
                    onClick={() => window.location.href = "/catalog"}
                  >
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    Продолжить покупки
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="w-full group flex-1 border-neutral-300 dark:border-neutral-700"
                    onClick={() => window.location.href = "/account/orders"}
                  >
                    <Package className="mr-2 h-5 w-5" />
                    Мои заказы
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
            <p className="text-neutral-600">Загрузка...</p>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}

