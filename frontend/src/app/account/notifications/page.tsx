"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  BellOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  Megaphone,
  Info,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/store/notification";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";
import { renderNotification } from "@/lib/notification-text";

const typeConfig: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  order: {
    icon: Package,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/40",
  },
  promotion: {
    icon: Megaphone,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/40",
  },
  system: {
    icon: Info,
    color: "text-neutral-600 dark:text-neutral-400",
    bg: "bg-neutral-100 dark:bg-neutral-800",
  },
  reminder: {
    icon: Bell,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/40",
  },
};

const KIND_ICONS = {
  success: { icon: CheckCircle2, color: "text-emerald-600" },
  error: { icon: XCircle, color: "text-red-600" },
  warning: { icon: AlertTriangle, color: "text-amber-600" },
} as const;

export default function NotificationsPage() {
  const t = useTranslation();
  const {
    notifications,
    isLoading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl text-charcoal dark:text-white">
            {t.notifications.title}
          </h1>
          {unreadCount > 0 && (
            <p className="mt-1 text-sm text-neutral-500">
              {t.profile.notifications.unread.replace("{count}", String(unreadCount))}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            className="gap-2 self-start sm:self-auto"
          >
            <CheckCheck className="h-4 w-4" />
            {t.notifications.markAllRead}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"
            >
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-neutral-200 dark:bg-neutral-700" />
                  <div className="h-3 w-2/3 rounded bg-neutral-200 dark:bg-neutral-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <BellOff className="mx-auto mb-4 h-12 w-12 text-neutral-300 dark:text-neutral-600" />
          <h3 className="mb-1 font-display text-lg text-charcoal dark:text-white">
            {t.notifications.empty}
          </h3>
          <p className="text-sm text-neutral-500">
            {t.profile.notifications.emptyDesc}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const config = typeConfig[notif.type] || typeConfig.system;
            const Icon = config.icon;
            const rendered = renderNotification(notif, t);
            const statusIcon = rendered.kind ? KIND_ICONS[rendered.kind] : null;

            return (
              <div
                key={notif.id}
                className={`group relative rounded-lg border p-4 transition-all ${
                  notif.is_read
                    ? "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
                    : "border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20"
                }`}
              >
                <div className="flex gap-3">
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${config.bg}`}
                  >
                    {statusIcon ? (
                      <statusIcon.icon className={`h-5 w-5 ${statusIcon.color}`} />
                    ) : (
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className={`text-sm font-semibold ${
                          notif.is_read
                            ? "text-neutral-700 dark:text-neutral-300"
                            : "text-charcoal dark:text-white"
                        }`}
                      >
                        {rendered.title}
                        {!notif.is_read && (
                          <span className="ml-2 inline-block h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </h3>
                      <span className="flex-shrink-0 text-xs text-neutral-400">
                        {formatDate(notif.created_at, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                      {rendered.message}
                    </p>

                    <div className="mt-2 flex items-center gap-3">
                      {notif.link && (
                        <Link
                          href={notif.link}
                          className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                        >
                          {t.profile.notifications.details}
                        </Link>
                      )}
                      {!notif.is_read && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          className="text-xs font-medium text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                        >
                          {t.notifications.markRead}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
