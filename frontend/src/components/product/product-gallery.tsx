"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/types";

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
  className?: string;
}

export function ProductGallery({
  images,
  productName,
  className,
}: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageError, setImageError] = useState(false);

  const sortedImages = [...images].sort((a, b) => {
    if (a.is_primary) return -1;
    if (b.is_primary) return 1;
    return a.sort_order - b.sort_order;
  });

  const hasImages = sortedImages.length > 0 && !imageError;
  const currentImage = hasImages ? sortedImages[selectedIndex] : null;

  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? sortedImages.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === sortedImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main image */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-neutral-100">
        {hasImages && currentImage ? (
          <>
            <Image
              src={currentImage.file_path}
              alt={currentImage.alt_text || productName}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
              priority
              className={cn(
                "object-cover transition-transform duration-500",
                isZoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"
              )}
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onError={() => setImageError(true)}
            />

            {/* Zoom indicator */}
            <div
              className={cn(
                "absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-neutral-700 shadow-sm backdrop-blur-sm transition-opacity",
                isZoomed ? "opacity-0" : "opacity-100"
              )}
            >
              <ZoomIn className="h-4 w-4" />
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-100">
            <span className="font-display text-3xl text-neutral-200">Velmora</span>
          </div>
        )}

        {/* Navigation arrows */}
        {sortedImages.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:scale-110"
              aria-label="Предыдущее изображение"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:scale-110"
              aria-label="Следующее изображение"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Image counter */}
        {sortedImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-charcoal/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            {selectedIndex + 1} / {sortedImages.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {sortedImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sortedImages.map((image, index) => (
            <motion.button
              key={image.id}
              onClick={() => setSelectedIndex(index)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "relative h-[72px] w-[56px] flex-shrink-0 overflow-hidden rounded-sm border-2 transition-all sm:h-[100px] sm:w-[80px]",
                selectedIndex === index
                  ? "border-primary-500 ring-2 ring-primary-200"
                  : "border-neutral-200 hover:border-primary-300"
              )}
            >
              <Image
                src={image.file_path}
                alt={`${productName} - миниатюра ${index + 1}`}
                fill
                unoptimized
                sizes="80px"
                className="object-cover"
                onError={() => setImageError(true)}
              />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
