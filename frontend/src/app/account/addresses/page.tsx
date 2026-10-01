"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import toast from "react-hot-toast";
import { MapPin, Plus, Pencil, Trash2, Star, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationPicker } from "@/components/ui/location-picker";
import { useTranslation } from "@/hooks/use-translation";
import {
  apiErrorDetail,
  useAddresses,
  useDeleteAddress,
  useSaveAddress,
  type SavedAddress,
} from "@/hooks/use-account";

const CARD = "rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900";

interface FormState {
  label: string;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
}

const EMPTY: FormState = { label: "", city: "", address: "", latitude: null, longitude: null, is_default: false };

function yandexLink(a: { latitude: number | null; longitude: number | null }) {
  return `https://yandex.uz/maps/?pt=${a.longitude},${a.latitude}&z=17&l=map`;
}

function AddressForm({
  initial,
  editingId,
  onDone,
}: {
  initial: FormState;
  editingId?: string;
  onDone: () => void;
}) {
  const t = useTranslation();
  const a = t.profile.addresses;
  const save = useSaveAddress();
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim() || !form.city.trim() || form.address.trim().length < 3) {
      setError(a.required);
      return;
    }
    setError("");
    try {
      await save.mutateAsync({
        id: editingId,
        data: {
          label: form.label.trim(),
          city: form.city.trim(),
          address: form.address.trim(),
          latitude: form.latitude,
          longitude: form.longitude,
          ...(form.is_default ? { is_default: true } : {}),
        },
      });
      toast.success(a.saved);
      onDone();
    } catch (err) {
      setError(apiErrorDetail(err) === "too_many_addresses" ? a.tooMany : t.profile.genericError);
    }
  };

  return (
    <form onSubmit={submit} className={`${CARD} space-y-4`}>
      <h2 className="font-display text-lg text-charcoal dark:text-white">
        {editingId ? a.formTitleEdit : a.formTitleNew}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={a.label}
          placeholder={a.labelPlaceholder}
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          maxLength={100}
        />
        <Input
          label={a.city}
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          maxLength={100}
        />
      </div>
      <Input
        label={a.address}
        placeholder={a.addressPlaceholder}
        value={form.address}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
        maxLength={500}
      />

      <div>
        <p className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">{a.map}</p>
        <p className="mb-2 text-xs text-neutral-500">{a.mapHint}</p>
        <LocationPicker
          initialAddress={form.address}
          initialCoords={form.latitude != null && form.longitude != null ? [form.latitude, form.longitude] : null}
          onAddressChange={(address, city) => setForm((f) => ({ ...f, address, city: f.city || city }))}
          onLocationChange={(lat, lon) => setForm((f) => ({ ...f, latitude: lat, longitude: lon }))}
        />
        {form.latitude != null && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <Navigation className="h-3.5 w-3.5" />
            {a.pinned}
          </p>
        )}
      </div>

      {!initial.is_default && (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={form.is_default}
            onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
            className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          {a.makeDefault}
        </label>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          {a.cancel}
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? t.profile.personal.saving : a.save}
        </Button>
      </div>
    </form>
  );
}

export default function AddressesPage() {
  const t = useTranslation();
  const a = t.profile.addresses;
  const { data: addresses = [], isLoading } = useAddresses();
  const del = useDeleteAddress();
  const save = useSaveAddress();
  const [editing, setEditing] = useState<SavedAddress | "new" | null>(null);

  const remove = async (addr: SavedAddress) => {
    if (!window.confirm(a.deleteConfirm)) return;
    try {
      await del.mutateAsync(addr.id);
      toast.success(a.deleted);
    } catch {
      toast.error(t.profile.genericError);
    }
  };

  const makeDefault = async (addr: SavedAddress) => {
    try {
      await save.mutateAsync({ id: addr.id, data: { is_default: true } });
    } catch {
      toast.error(t.profile.genericError);
    }
  };

  return (
    <div className="space-y-6">
      <div className={CARD}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mb-2 font-display text-2xl text-charcoal dark:text-white lg:text-3xl">{a.title}</h1>
            <p className="text-neutral-600 dark:text-neutral-400">{a.subtitle}</p>
          </div>
          {editing === null && addresses.length > 0 && (
            <Button onClick={() => setEditing("new")} disabled={addresses.length >= 10}>
              <Plus className="mr-2 h-4 w-4" />
              {a.add}
            </Button>
          )}
        </div>
      </div>

      {editing !== null && (
        <AddressForm
          key={editing === "new" ? "new" : editing.id}
          editingId={editing === "new" ? undefined : editing.id}
          initial={
            editing === "new"
              ? { ...EMPTY, is_default: addresses.length === 0 }
              : {
                  label: editing.label,
                  city: editing.city,
                  address: editing.address,
                  latitude: editing.latitude,
                  longitude: editing.longitude,
                  is_default: editing.is_default,
                }
          }
          onDone={() => setEditing(null)}
        />
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className={`${CARD} h-36 animate-pulse`} />
          ))}
        </div>
      ) : addresses.length === 0 && editing === null ? (
        <div className={`${CARD} p-12 text-center`}>
          <MapPin className="mx-auto mb-4 h-16 w-16 text-neutral-300 dark:text-neutral-600" />
          <h2 className="mb-2 font-display text-xl text-charcoal dark:text-white">{a.emptyTitle}</h2>
          <p className="mb-6 text-neutral-600 dark:text-neutral-400">{a.emptyDesc}</p>
          <Button size="lg" onClick={() => setEditing("new")}>
            <Plus className="mr-2 h-4 w-4" />
            {a.add}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`${CARD} flex flex-col ${addr.is_default ? "ring-2 ring-primary-300 dark:ring-primary-700" : ""}`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 flex-shrink-0 text-primary-500" />
                  <h3 className="font-medium text-charcoal dark:text-white">{addr.label}</h3>
                </div>
                {addr.is_default && (
                  <span className="flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                    <Star className="h-3 w-3" />
                    {a.default}
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{addr.city}</p>
              <p className="mb-3 text-sm text-neutral-800 dark:text-neutral-200">{addr.address}</p>
              {addr.latitude != null && addr.longitude != null && (
                <a
                  href={yandexLink(addr)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  {a.openMap}
                </a>
              )}
              <div className="mt-auto flex flex-wrap gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                <Button size="sm" variant="ghost" onClick={() => setEditing(addr)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  {a.edit}
                </Button>
                {!addr.is_default && (
                  <Button size="sm" variant="ghost" onClick={() => makeDefault(addr)}>
                    <Star className="mr-1.5 h-3.5 w-3.5" />
                    {a.setDefault}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                  onClick={() => remove(addr)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  {a.delete}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
