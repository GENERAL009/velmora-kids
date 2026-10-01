"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Package,
  Heart,
  MapPin,
  Clock,
  Wallet,
  Truck,
  Settings,
  UserRound,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, formatDate } from "@/lib/utils";
import { useRecentOrders } from "@/hooks/use-admin";
import {
  apiErrorDetail,
  useAccountSummary,
  useChangePassword,
  useUpdateProfile,
} from "@/hooks/use-account";
import { useTranslation } from "@/hooks/use-translation";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  pending: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  confirmed: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  processing: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  packing: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  ready: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  shipped: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  returned: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
};

const CARD = "rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900";

function PersonalDataCard() {
  const t = useTranslation();
  const p = t.profile.personal;
  const { user, setUser } = useAuthStore();
  const updateProfile = useUpdateProfile();
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setForm({ first_name: user.first_name || "", last_name: user.last_name || "", phone: user.phone || "" });
    }
  }, [user]);

  const dirty =
    !!user &&
    (form.first_name.trim() !== (user.first_name || "") ||
      form.last_name.trim() !== (user.last_name || "") ||
      form.phone.trim() !== (user.phone || ""));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.first_name.trim()) errs.first_name = p.required;
    if (!form.last_name.trim()) errs.last_name = p.required;
    const digits = form.phone.replace(/\D/g, "");
    if (form.phone.trim() && digits.length < 9) errs.phone = p.phoneInvalid;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      const updated = await updateProfile.mutateAsync({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      });
      setUser(updated);
      toast.success(p.saved);
    } catch (error) {
      const detail = apiErrorDetail(error);
      if (detail && /phone/i.test(detail)) setErrors({ phone: p.phoneTaken });
      else toast.error(t.profile.genericError);
    }
  };

  return (
    <form onSubmit={submit} className={CARD}>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40">
          <UserRound className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h2 className="font-display text-lg text-charcoal dark:text-white">{p.title}</h2>
          <p className="text-sm text-neutral-500">{p.subtitle}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={p.firstName}
          value={form.first_name}
          onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          error={errors.first_name}
          maxLength={100}
          autoComplete="given-name"
        />
        <Input
          label={p.lastName}
          value={form.last_name}
          onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          error={errors.last_name}
          maxLength={100}
          autoComplete="family-name"
        />
        <Input
          label={p.phone}
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          error={errors.phone}
          placeholder="+998 90 123 45 67"
          maxLength={20}
          autoComplete="tel"
        />
        <div>
          <Input label={p.email} value={user?.email || ""} disabled readOnly />
          <p className="mt-1 text-xs text-neutral-500">{p.emailHint}</p>
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <Button type="submit" disabled={!dirty || updateProfile.isPending}>
          {updateProfile.isPending ? p.saving : p.save}
        </Button>
      </div>
    </form>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  error,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        label={label}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={error}
        autoComplete={autoComplete}
        maxLength={128}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-[34px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
        tabIndex={-1}
        aria-label={label}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function ChangePasswordCard() {
  const t = useTranslation();
  const p = t.profile.password;
  const changePassword = useChangePassword();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.current) errs.current = t.profile.personal.required;
    if (form.next.length < 8) errs.next = p.tooShort;
    if (form.next !== form.confirm) errs.confirm = p.mismatch;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await changePassword.mutateAsync({ current_password: form.current, new_password: form.next });
      setForm({ current: "", next: "", confirm: "" });
      toast.success(p.changed);
    } catch (error) {
      const detail = apiErrorDetail(error);
      if (detail === "wrong_current_password") setErrors({ current: p.wrongCurrent });
      else if (detail === "same_password") setErrors({ next: p.same });
      else if (detail === "rate_limited") toast.error(p.tooMany);
      else toast.error(t.profile.genericError);
    }
  };

  return (
    <form onSubmit={submit} className={CARD}>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
          <KeyRound className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="font-display text-lg text-charcoal dark:text-white">{p.title}</h2>
          <p className="text-sm text-neutral-500">{p.subtitle}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <PasswordInput label={p.current} value={form.current} onChange={(v) => setForm({ ...form, current: v })} error={errors.current} autoComplete="current-password" />
        <PasswordInput label={p.new} value={form.next} onChange={(v) => setForm({ ...form, next: v })} error={errors.next} autoComplete="new-password" />
        <PasswordInput label={p.confirm} value={form.confirm} onChange={(v) => setForm({ ...form, confirm: v })} error={errors.confirm} autoComplete="new-password" />
      </div>
      <div className="mt-5 flex justify-end">
        <Button type="submit" variant="outline" disabled={changePassword.isPending || !form.current || !form.next}>
          {changePassword.isPending ? p.submitting : p.submit}
        </Button>
      </div>
    </form>
  );
}

export default function AccountPage() {
  const { user } = useAuthStore();
  const t = useTranslation();
  const statusLabels: Record<string, string> = {
    ...t.orderStatus,
    ...t.ordersUi.status,
  };
  const { data: summary } = useAccountSummary();
  const { data: ordersData } = useRecentOrders(3);
  const recentOrders = ordersData?.items ?? [];

  const QUICK_LINKS = [
    { title: t.nav.myOrders, description: t.account.orders, href: "/account/orders", icon: Package, color: "from-primary-400 to-primary-600" },
    { title: t.nav.favorites, description: t.account.favorites, href: "/account/favorites", icon: Heart, color: "from-rose-400 to-rose-600" },
    { title: t.profile.addresses.nav, description: t.profile.addressesLink, href: "/account/addresses", icon: MapPin, color: "from-sky-400 to-blue-600" },
    { title: t.account.settings, description: t.profile.settingsLink, href: "/account/settings", icon: Settings, color: "from-neutral-400 to-neutral-600" },
  ];

  const stats = [
    { label: t.profile.stats.orders, value: summary?.orders_count ?? "—", icon: Package, color: "text-primary-600", href: "/account/orders", wide: false },
    { label: t.profile.stats.active, value: summary?.active_orders_count ?? "—", icon: Truck, color: "text-purple-600", href: "/account/orders", wide: false },
    { label: t.profile.stats.spent, value: summary ? formatPrice(summary.total_spent) : "—", icon: Wallet, color: "text-emerald-600", wide: true },
    { label: t.profile.stats.favorites, value: summary?.favorites_count ?? "—", icon: Heart, color: "text-rose-500", href: "/account/favorites", wide: false },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="rounded-lg border border-neutral-200 bg-gradient-to-br from-white to-primary-50/30 p-6 shadow-sm dark:border-neutral-700 dark:from-neutral-900 dark:to-primary-950/20 lg:p-8">
        <h1 className="mb-2 font-display text-2xl text-charcoal dark:text-white lg:text-3xl">
          {t.account.welcome}, {user?.first_name}!
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">{t.profile.overviewSubtitle}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          const body = (
            <>
              <div className={`mb-2 flex items-start gap-1.5 sm:items-center sm:gap-2 ${s.color}`}>
                <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 sm:mt-0 sm:h-5 sm:w-5" />
                <span className="text-xs font-medium leading-tight sm:text-sm">{s.label}</span>
              </div>
              <p className="truncate font-display text-xl text-charcoal dark:text-white lg:text-2xl" title={String(s.value)}>{s.value}</p>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className={`${CARD} !p-3 transition-shadow hover:shadow-md sm:!p-4 md:!p-5`}>
              {body}
            </Link>
          ) : (
            <div key={s.label} className={`${CARD} !p-3 sm:!p-4 md:!p-5 ${s.wide ? "order-first col-span-3 xl:order-none xl:col-span-1" : ""}`}>{body}</div>
          );
        })}
      </div>

      <PersonalDataCard />
      <ChangePasswordCard />

      {/* Quick links */}
      <div>
        <h2 className="mb-4 font-display text-xl text-charcoal dark:text-white">{t.profile.quickLinks}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group rounded-lg border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900"
              >
                <div className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br ${link.color} shadow-sm`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mb-1 font-medium text-charcoal group-hover:text-primary-600 dark:text-white">{link.title}</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{link.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent orders */}
      <div className={CARD}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-charcoal dark:text-white">{t.profile.recentOrders}</h2>
          <Link href="/account/orders">
            <Button variant="ghost" size="sm">{t.profile.allOrders}</Button>
          </Link>
        </div>

        {recentOrders.length > 0 ? (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="block rounded-lg border border-neutral-200 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="font-medium text-charcoal dark:text-white">{order.order_number}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700"}`}>
                        {statusLabels[order.status] ?? order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400">
                      <Clock className="h-4 w-4" />
                      {formatDate(order.created_at, { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  <p className="font-semibold text-charcoal dark:text-white">{formatPrice(order.total)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Package className="mx-auto mb-3 h-12 w-12 text-neutral-300" />
            <p className="mb-1 font-medium text-neutral-700 dark:text-neutral-300">{t.account.noOrders}</p>
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">{t.profile.startShopping}</p>
            <Link href="/catalog">
              <Button>{t.cart.goToCatalog}</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
