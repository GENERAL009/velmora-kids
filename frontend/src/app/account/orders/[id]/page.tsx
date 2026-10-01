"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Package, Clock, MapPin, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDate } from "@/lib/utils";
import { useAdminOrderDetail } from "@/hooks/use-admin";
import { useTranslation } from "@/hooks/use-translation";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  pending: "bg-blue-100 text-blue-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  processing: "bg-amber-100 text-amber-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function AccountOrderDetailPage() {
  const t = useTranslation();
  const STATUS_LABELS: Record<string, string> = {
    new: t.ordersUi.status.new,
    pending: t.orderStatus.pending,
    confirmed: t.orderStatus.confirmed,
    processing: t.orderStatus.processing,
    shipped: t.orderStatus.shipped,
    delivered: t.orderStatus.delivered,
    cancelled: t.orderStatus.cancelled,
  };
  const PAYMENT_METHOD_LABELS: Record<string, string> = t.ordersUi.paymentMethods;
  const params = useParams();
  const orderId = params.id as string;
  const { data: order, isLoading, error } = useAdminOrderDetail(orderId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse rounded-lg border border-neutral-200 bg-white p-6">
          <div className="h-6 w-48 bg-neutral-200 rounded mb-4" />
          <div className="h-4 w-32 bg-neutral-200 rounded" />
        </div>
        <div className="animate-pulse rounded-lg border border-neutral-200 bg-white p-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-neutral-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
        <Package className="mx-auto mb-4 h-16 w-16 text-neutral-300" />
        <h2 className="mb-2 font-display text-xl text-charcoal">{t.ordersUi.notFound}</h2>
        <Link href="/account/orders">
          <Button>{t.ordersUi.backToOrders}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/account/orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.common.back}
            </Button>
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl text-charcoal">
              {t.ordersUi.orderTitle.replace("{number}", order.order_number)}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-neutral-600">
              <Clock className="h-4 w-4" />
              {formatDate(order.created_at)}
            </div>
          </div>
          <span className={`rounded-full px-4 py-1.5 text-sm font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700"}`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-display text-lg text-charcoal">{t.ordersUi.items}</h2>
        <div className="divide-y divide-neutral-200">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div>
                <p className="font-medium text-charcoal">{item.product_name}</p>
                <p className="text-sm text-neutral-500">
                  {item.size_name && t.ordersUi.size.replace("{value}", item.size_name)}
                  {item.color_name && ` / ${t.ordersUi.color.replace("{value}", item.color_name)}`}
                </p>
                <p className="text-sm text-neutral-500">
                  {item.quantity} x {formatPrice(item.unit_price)}
                </p>
              </div>
              <p className="font-semibold text-charcoal">{formatPrice(item.total)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Delivery */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary-500" />
            <h3 className="font-medium text-charcoal">{t.cart.delivery}</h3>
          </div>
          <div className="space-y-1 text-sm text-neutral-600">
            <p>{order.customer_first_name} {order.customer_last_name}</p>
            <p>{order.customer_phone}</p>
            {order.delivery_city && <p>{order.delivery_city}</p>}
            {order.delivery_address && <p>{order.delivery_address}</p>}
            {order.delivery_method && (
              <p className="capitalize">{order.delivery_method === "courier" ? t.ordersUi.deliveryMethods.courier : t.ordersUi.deliveryMethods.pickup}</p>
            )}
          </div>
        </div>

        {/* Payment */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary-500" />
            <h3 className="font-medium text-charcoal">{t.ordersUi.payment}</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-600">{t.ordersUi.subtotal}</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-neutral-600">{t.cart.discount}</span>
                <span className="text-green-600">-{formatPrice(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-neutral-600">{t.cart.delivery}</span>
              <span>{order.delivery_fee > 0 ? formatPrice(order.delivery_fee) : t.cart.free}</span>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-2 font-semibold text-charcoal">
              <span>{t.cart.summary}</span>
              <span className="text-lg">{formatPrice(order.total)}</span>
            </div>
          </div>
          <div className="mt-3 text-sm">
            <span className="text-neutral-500">{t.ordersUi.paymentMethod} </span>
            <span className="font-medium capitalize">{PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method}</span>
          </div>
        </div>
      </div>

      {order.comment && (
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="mb-2 font-medium text-charcoal">{t.ordersUi.comment}</h3>
          <p className="text-sm text-neutral-600">{order.comment}</p>
        </div>
      )}
    </div>
  );
}
