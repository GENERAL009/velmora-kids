"use client";

export const dynamic = "force-dynamic";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Package, Phone, MapPin, CreditCard, MessageSquare, Check, AlertTriangle } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDate } from "@/lib/utils";
import { useAdminOrderDetail } from "@/hooks/use-admin";
import { apiPatch } from "@/lib/api";

/** Allowed status transitions keyed by current status */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** Human-readable action labels for each target status */
const ACTION_LABELS: Record<string, string> = {
  confirmed: "Подтвердить",
  processing: "Собрать",
  shipped: "Отправить",
  delivered: "Доставлен",
  cancelled: "Отменить",
};

function ConfirmPaymentButton({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);

  const confirmMutation = useMutation({
    mutationFn: () => apiPatch(`/orders/${orderId}/confirm-payment`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      setShowConfirm(false);
    },
  });

  return (
    <>
      <Button variant="default" size="sm" className="w-full mt-2 bg-green-600 hover:bg-green-700" onClick={() => setShowConfirm(true)}>
        <Check className="w-4 h-4 mr-1" /> Подтвердить оплату
      </Button>
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowConfirm(false)}>
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-xl border max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Подтвердить оплату?</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Заказ <b>{orderNumber}</b> будет отмечен как оплаченный. Уведомление будет отправлено в Telegram.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setShowConfirm(false)}>Отмена</Button>
              <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" isLoading={confirmMutation.isPending} onClick={() => confirmMutation.mutate()}>
                Подтвердить
              </Button>
            </div>
            {confirmMutation.isError && <p className="mt-2 text-sm text-red-500">Ошибка. Попробуйте снова.</p>}
          </div>
        </div>
      )}
    </>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const queryClient = useQueryClient();
  const { data: order, isLoading, error } = useAdminOrderDetail(orderId);
  const [notes, setNotes] = useState("");
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: string) =>
      apiPatch(`/orders/${orderId}/status`, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      setConfirmAction(null);
    },
  });

  const handleStatusChange = useCallback((targetStatus: string) => {
    setConfirmAction(targetStatus);
  }, []);

  const confirmStatusChange = useCallback(() => {
    if (confirmAction) {
      updateStatusMutation.mutate(confirmAction);
    }
  }, [confirmAction, updateStatusMutation]);

  const statusLabels: Record<string, string> = {
    new: "Новый",
    confirmed: "Подтверждён",
    processing: "В обработке",
    shipped: "Отправлен",
    delivered: "Доставлен",
    cancelled: "Отменён",
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="animate-pulse space-y-2 flex-1">
            <div className="h-8 w-48 bg-neutral-200 rounded" />
            <div className="h-4 w-32 bg-neutral-200 rounded" />
          </div>
        </div>
        <div className="animate-pulse h-32 bg-neutral-200 rounded-lg" />
        <div className="animate-pulse h-64 bg-neutral-200 rounded-lg" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
            Заказ не найден
          </h1>
        </div>
      </div>
    );
  }

  const statusOrder = ["new", "confirmed", "processing", "shipped", "delivered"];
  const currentStatusIdx = statusOrder.indexOf(order.status);
  const timeline = statusOrder.map((status, idx) => ({
    status,
    completed: order.status === "cancelled" ? false : idx <= currentStatusIdx,
    date:
      status === "new" ? order.created_at :
      status === "confirmed" ? order.confirmed_at :
      status === "shipped" ? order.shipped_at :
      status === "delivered" ? order.delivered_at :
      null,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
            Заказ {order.order_number}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            {formatDate(order.created_at)} в{" "}
            {new Date(order.created_at).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.payment_status} />
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-soft border border-neutral-200 dark:border-neutral-700">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">
          Статус заказа
        </h2>
        <div className="flex items-center justify-between relative">
          <div className="absolute top-5 left-0 right-0 h-1 bg-neutral-200 dark:bg-neutral-700">
            <div
              className="h-full bg-primary-500 transition-all duration-500"
              style={{
                width: `${(timeline.filter((s) => s.completed).length / timeline.length) * 100}%`,
              }}
            />
          </div>

          {timeline.map((step, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 relative z-10">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  step.completed
                    ? "bg-primary-500 text-white"
                    : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
                }`}
              >
                {step.completed ? <Check className="w-5 h-5" /> : <div className="w-3 h-3 rounded-full bg-current" />}
              </div>
              <div className="text-center min-w-[80px]">
                <p
                  className={`text-xs font-medium ${
                    step.completed
                      ? "text-neutral-900 dark:text-white"
                      : "text-neutral-500 dark:text-neutral-400"
                  }`}
                >
                  {statusLabels[step.status]}
                </p>
                {step.date && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {new Date(step.date).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-soft border border-neutral-200 dark:border-neutral-700">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5" />
                Товары в заказе
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-700 last:border-0 last:pb-0"
                  >
                    <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-8 h-8 text-neutral-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-neutral-900 dark:text-white mb-1">
                        {item.product_name}
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                        {item.product_sku}
                      </p>
                      <div className="flex gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                        <span>Размер: {item.size_name}</span>
                        <span>Цвет: {item.color_name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-neutral-900 dark:text-white">
                        {formatPrice(item.total)}
                      </p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        {item.quantity} × {formatPrice(item.unit_price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Total */}
              <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700 space-y-2">
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Подытог:</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Скидка:</span>
                    <span>-{formatPrice(order.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Доставка:</span>
                  <span>{formatPrice(order.delivery_fee)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-neutral-900 dark:text-white pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <span>Итого:</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-soft border border-neutral-200 dark:border-neutral-700">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
              Действия
            </h2>
            {(() => {
              const transitions = STATUS_TRANSITIONS[order.status] ?? [];
              if (transitions.length === 0) {
                return (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Нет доступных действий для текущего статуса.
                  </p>
                );
              }
              return (
                <div className="flex flex-wrap gap-3">
                  {transitions.map((targetStatus) => (
                    <Button
                      key={targetStatus}
                      variant={targetStatus === "cancelled" ? "destructive" : "default"}
                      size="sm"
                      disabled={updateStatusMutation.isPending}
                      onClick={() => handleStatusChange(targetStatus)}
                    >
                      {ACTION_LABELS[targetStatus] ?? targetStatus}
                    </Button>
                  ))}
                </div>
              );
            })()}

            {updateStatusMutation.isError && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                Ошибка при изменении статуса. Попробуйте ещё раз.
              </p>
            )}
          </div>

          {/* Confirmation Dialog */}
          {confirmAction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-xl border border-neutral-200 dark:border-neutral-700 max-w-md w-full mx-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className={`p-2 rounded-full ${confirmAction === "cancelled" ? "bg-red-100 dark:bg-red-900/30" : "bg-primary-100 dark:bg-primary-900/30"}`}>
                    <AlertTriangle className={`w-5 h-5 ${confirmAction === "cancelled" ? "text-red-600 dark:text-red-400" : "text-primary-600 dark:text-primary-400"}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                      Подтвердите действие
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                      {confirmAction === "cancelled"
                        ? `Вы уверены, что хотите отменить заказ ${order.order_number}? Это действие нельзя отменить.`
                        : `Изменить статус заказа ${order.order_number} на "${statusLabels[confirmAction] ?? confirmAction}"?`}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={updateStatusMutation.isPending}
                    onClick={() => setConfirmAction(null)}
                  >
                    Отмена
                  </Button>
                  <Button
                    variant={confirmAction === "cancelled" ? "destructive" : "default"}
                    size="sm"
                    isLoading={updateStatusMutation.isPending}
                    onClick={confirmStatusChange}
                  >
                    {ACTION_LABELS[confirmAction] ?? "Подтвердить"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-soft border border-neutral-200 dark:border-neutral-700">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Заметки
            </h2>
            {order.comment && (
              <div className="mb-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {order.comment}
                </p>
              </div>
            )}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Добавить заметку..."
              rows={3}
              className="w-full px-4 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white resize-none"
            />
            <Button variant="outline" size="sm" className="mt-3">
              Добавить заметку
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-soft border border-neutral-200 dark:border-neutral-700">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Клиент
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Имя</p>
                <p className="font-medium text-neutral-900 dark:text-white">
                  {order.customer_first_name} {order.customer_last_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Телефон</p>
                <a
                  href={`tel:${order.customer_phone}`}
                  className="font-medium text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {order.customer_phone}
                </a>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-soft border border-neutral-200 dark:border-neutral-700">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Доставка
            </h2>
            <div className="space-y-3">
              {order.delivery_method && (
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Метод</p>
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {order.delivery_method}
                  </p>
                </div>
              )}
              {order.delivery_address && (
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Адрес</p>
                  <p className="text-sm text-neutral-900 dark:text-white">
                    {order.delivery_city && `${order.delivery_city}, `}
                    {order.delivery_address}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Стоимость</p>
                <p className="font-medium text-neutral-900 dark:text-white">
                  {formatPrice(order.delivery_fee)}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-soft border border-neutral-200 dark:border-neutral-700">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Оплата
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Метод</p>
                <p className="font-medium text-neutral-900 dark:text-white">
                  {{ cash: "Наличные", card_transfer: "Карта перевод", bank_transfer: "Банк перевод", payme: "Payme", click: "Click" }[order.payment_method] || order.payment_method}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Статус</p>
                <StatusBadge status={order.payment_status} />
              </div>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Сумма</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatPrice(order.total)}
                </p>
              </div>
              {order.payment_status !== "paid" && (
                <ConfirmPaymentButton orderId={orderId} orderNumber={order.order_number} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
