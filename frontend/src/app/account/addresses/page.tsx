"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AddressesPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2 font-display text-2xl text-charcoal lg:text-3xl">
              Адреса доставки
            </h1>
            <p className="text-neutral-600">
              Управляйте вашими адресами для быстрого оформления заказа
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center shadow-sm">
        <MapPin className="mx-auto mb-4 h-16 w-16 text-neutral-300" />
        <h2 className="mb-2 font-display text-xl text-charcoal">
          У вас пока нет сохраненных адресов
        </h2>
        <p className="mb-6 text-neutral-600">
          Адреса будут автоматически сохраняться при оформлении заказов
        </p>
        <Link href="/catalog">
          <Button size="lg">Перейти в каталог</Button>
        </Link>
      </div>
    </div>
  );
}
