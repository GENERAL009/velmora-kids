"use client";

import React, { useState } from "react";
import { formatPrice } from "@/lib/utils";
import { statusConfig } from "@/components/admin/status-badge";
import type { RevenueDataPoint, StatusCount } from "@/hooks/use-admin";

const UZ_MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];

function shortDate(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d}-${UZ_MONTHS[(m || 1) - 1]}`;
}

function compactMoney(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)} mln`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} ming`;
  return String(Math.round(n));
}

/** Nice round upper bound for the y-axis */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * p;
}

/**
 * Daily revenue — one series, one hue (magnitude). Thin bars with 4px rounded tops,
 * recessive gridlines, hover tooltip per bar (hit area = full column).
 */
export function RevenueBarChart({ data, height = 200 }: { data: RevenueDataPoint[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.revenue)));
  const total = data.reduce((s, d) => s + d.revenue, 0);
  const labelEvery = data.length <= 10 ? 1 : data.length <= 31 ? Math.ceil(data.length / 8) : Math.ceil(data.length / 10);

  if (data.length === 0 || total === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-neutral-400" style={{ height }}>
        Tanlangan davrda to'langan buyurtmalar yo'q
      </div>
    );
  }

  const ticks = [max, max / 2, 0];
  return (
    <div className="relative">
      <div className="flex gap-2">
        {/* y axis */}
        <div className="flex flex-col justify-between py-0 text-right text-[11px] text-neutral-400" style={{ height }}>
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">{compactMoney(t)}</span>
          ))}
        </div>
        <div className="relative flex-1" style={{ height }}>
          {/* gridlines */}
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute inset-x-0 border-t border-dashed border-neutral-200 dark:border-neutral-700"
              style={{ bottom: `${(t / max) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((d, i) => {
              const h = (d.revenue / max) * 100;
              return (
                <div
                  key={d.date}
                  className="group relative flex h-full flex-1 cursor-default items-end justify-center"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  <div
                    className={`w-full max-w-[28px] rounded-t-[4px] transition-colors ${
                      hover === i ? "bg-primary-600" : "bg-primary-400 dark:bg-primary-500"
                    }`}
                    style={{ height: d.revenue > 0 ? `max(${h}%, 2px)` : "0" }}
                  />
                  {hover === i && (
                    <div
                      className="pointer-events-none absolute z-10 w-max -translate-x-1/2 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
                      style={{ bottom: `calc(${Math.max(h, 0)}% + 8px)`, left: "50%" }}
                    >
                      <p className="font-medium text-neutral-900 dark:text-white">{shortDate(d.date)}</p>
                      <p className="text-neutral-600 dark:text-neutral-300">{formatPrice(d.revenue)}</p>
                      <p className="text-neutral-500">{d.orders} ta buyurtma</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* x labels (positioned at column centres so they can be wider than a bar) */}
      <div className="relative ml-[42px] mt-2 h-4">
        {data.map((d, i) =>
          i % labelEvery === 0 || (i === data.length - 1 && (data.length - 1) % labelEvery >= labelEvery / 2) ? (
            <span
              key={d.date}
              className="absolute -translate-x-1/2 whitespace-nowrap text-[11px] text-neutral-500 dark:text-neutral-400"
              style={{ left: `${((i + 0.5) / data.length) * 100}%` }}
            >
              {shortDate(d.date)}
            </span>
          ) : null
        )}
      </div>
    </div>
  );
}

const STATUS_ORDER = ["new", "confirmed", "processing", "packing", "ready", "shipped", "delivered", "cancelled", "returned"];

/** Orders per status — labelled horizontal bars (identity by label, not color). */
export function StatusBreakdown({ data }: { data: StatusCount[] }) {
  const rows = STATUS_ORDER.map((s) => ({ status: s, count: data.find((d) => d.status === s)?.count ?? 0 })).filter(
    (r) => r.count > 0 || ["new", "processing", "shipped", "delivered", "cancelled"].includes(r.status)
  );
  const total = rows.reduce((s, r) => s + r.count, 0);
  const max = Math.max(1, ...rows.map((r) => r.count));

  if (total === 0) {
    return <p className="py-10 text-center text-sm text-neutral-400">Tanlangan davrda buyurtmalar yo'q</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const pct = total ? Math.round((r.count / total) * 100) : 0;
        return (
          <div key={r.status} className="group" title={`${statusConfig[r.status]?.label ?? r.status}: ${r.count} (${pct}%)`}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-neutral-700 dark:text-neutral-300">{statusConfig[r.status]?.label ?? r.status}</span>
              <span className="tabular-nums text-neutral-900 dark:text-white">
                <span className="font-semibold">{r.count}</span>
                <span className="ml-1.5 text-xs text-neutral-500">{pct}%</span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  r.status === "cancelled" || r.status === "returned"
                    ? "bg-neutral-400 dark:bg-neutral-500"
                    : "bg-primary-400 group-hover:bg-primary-600 dark:bg-primary-500"
                }`}
                style={{ width: `${(r.count / max) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className="pt-1 text-xs text-neutral-500">Jami: {total} ta buyurtma</p>
    </div>
  );
}
