"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { GripVertical, Loader2, Star, Trash2, Upload } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { apiDelete, apiPost, apiPut } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface ManagedImage {
  id?: string;
  file_path: string;
  alt_text?: string | null;
  sort_order: number;
  is_primary: boolean;
}

/** Gallery order as the shop shows it: main image first, then by sort_order */
const ordered = (list: ManagedImage[]) =>
  [...list].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);

function SortableImage({
  img,
  index,
  onDelete,
  onMakeFirst,
}: {
  img: ManagedImage;
  index: number;
  onDelete: () => void;
  onMakeFirst: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.id! });
  // buttons inside the draggable tile must not start a drag
  const stop = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => e.stopPropagation();

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative aspect-square cursor-grab touch-manipulation select-none overflow-hidden rounded-lg border bg-white active:cursor-grabbing dark:bg-neutral-900",
        index === 0 ? "border-primary-400 ring-2 ring-primary-200 dark:ring-primary-900/50" : "border-neutral-200 dark:border-neutral-700",
        isDragging && "z-20 scale-105 opacity-90 shadow-xl"
      )}
      {...attributes}
      {...listeners}
      aria-label={`Rasm ${index + 1}. Tartibini o'zgartirish uchun bosib turib suring`}
    >
      <Image
        src={img.file_path}
        alt={img.alt_text || "Product"}
        fill
        unoptimized
        draggable={false}
        className="pointer-events-none object-contain"
      />

      {/* position badge: 1, 2, 3 … (1 = main image) */}
      <span
        className={cn(
          "absolute left-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center gap-0.5 rounded-full px-1.5 text-[11px] font-semibold shadow",
          index === 0 ? "bg-primary-500 text-white" : "bg-white/90 text-neutral-700 dark:bg-neutral-800/90 dark:text-neutral-200"
        )}
      >
        {index === 0 && <Star className="h-3 w-3 fill-current" />}
        {index + 1}
      </span>

      <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-md bg-white/80 p-1 text-neutral-500 dark:bg-neutral-800/80">
        <GripVertical className="h-3.5 w-3.5" />
      </span>

      <div className="absolute right-1.5 top-1.5 flex flex-col gap-1">
        <button
          type="button"
          onPointerDown={stop}
          onMouseDown={stop}
          onTouchStart={stop}
          onClick={onDelete}
          className="rounded-full bg-white/95 p-1.5 text-red-600 shadow hover:bg-red-50 dark:bg-neutral-800/95"
          title="O'chirish"
          aria-label="O'chirish"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        {index !== 0 && (
          <button
            type="button"
            onPointerDown={stop}
            onMouseDown={stop}
            onTouchStart={stop}
            onClick={onMakeFirst}
            className="rounded-full bg-white/95 p-1.5 text-primary-600 shadow hover:bg-primary-50 dark:bg-neutral-800/95"
            title="Asosiy qilish (1-o'ringa)"
            aria-label="Asosiy qilish"
          >
            <Star className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function ProductImageManager({
  productId,
  initialImages,
  className,
}: {
  productId: string;
  initialImages: ManagedImage[];
  className?: string;
}) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ManagedImage[]>(() => ordered(initialImages));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setImages(ordered(initialImages));
  }, [initialImages]);

  const sensors = useSensors(
    // mouse: start after a small move so clicks still work
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // touch: press and hold, so the page can still be scrolled
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["product"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const saveOrder = async (next: ManagedImage[], prev: ManagedImage[]) => {
    setImages(next.map((img, i) => ({ ...img, sort_order: i, is_primary: i === 0 })));
    setSaving(true);
    try {
      await apiPut(`/products/${productId}/images/order`, { image_ids: next.map((i) => i.id) });
      refresh();
    } catch {
      setImages(prev);
      toast.error("Tartibni saqlab bo'lmadi");
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = images.findIndex((i) => i.id === active.id);
    const to = images.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    saveOrder(arrayMove(images, from, to), images);
  };

  const makeFirst = (id: string) => {
    const from = images.findIndex((i) => i.id === id);
    if (from > 0) saveOrder(arrayMove(images, from, 0), images);
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (!productId) return;
    setUploading(true);
    try {
      // sequential, so the gallery keeps the order the files were picked in
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const img = await apiPost<ManagedImage>(`/products/${productId}/images`, formData, {
          headers: { "Content-Type": undefined },
        });
        if (img) setImages((prev) => ordered([...prev, img]));
      }
      refresh();
    } catch {
      toast.error("Rasm yuklashda xatolik");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm("Rasmni o'chirmoqchimisiz?")) return;
    const prev = images;
    const rest = images.filter((img) => img.id !== imageId);
    setImages(rest.map((img, i) => ({ ...img, is_primary: i === 0 })));
    try {
      await apiDelete(`/products/${productId}/images/${imageId}`);
      refresh();
    } catch {
      setImages(prev);
      toast.error("O'chirishda xatolik");
    }
  };

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Rasmlar</h2>
        {saving && (
          <span className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saqlanmoqda…
          </span>
        )}
      </div>

      {/* Upload area */}
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors sm:p-8",
          dragOver
            ? "border-primary-500 bg-primary-50 dark:bg-primary-950/20"
            : "border-neutral-300 hover:border-primary-400 dark:border-neutral-600"
        )}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        {uploading ? (
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-500" />
        ) : (
          <>
            <Upload className="mx-auto mb-2 h-8 w-8 text-neutral-400" />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Fayllarni bu yerga tashlang yoki tanlash uchun bosing
            </p>
            <p className="mt-1 text-xs text-neutral-400">JPEG, PNG, WebP, AVIF</p>
          </>
        )}
      </div>

      {images.length > 0 && (
        <>
          <p className="mb-2 mt-4 text-xs text-neutral-500 dark:text-neutral-400">
            Tartibni o&apos;zgartirish uchun rasmni bosib turib kerakli joyga suring. Chapdan o&apos;ngga: 1, 2, 3…
            — <span className="font-medium text-primary-600">1-rasm asosiy</span> bo&apos;lib, saytda birinchi ko&apos;rinadi.
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={images.map((i) => i.id!)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {images.map((img, index) => (
                  <SortableImage
                    key={img.id}
                    img={img}
                    index={index}
                    onDelete={() => handleDelete(img.id!)}
                    onMakeFirst={() => makeFirst(img.id!)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}
    </div>
  );
}
