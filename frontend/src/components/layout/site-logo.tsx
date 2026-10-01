"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/hooks/use-site-settings";

/**
 * Logo uploaded in Admin → Sozlamalar → Logotiplar ("shapka" for the header, "futer" for the footer).
 * Falls back to the text wordmark when no logo is set or the file fails to load.
 */
export function SiteLogo({
  variant = "header",
  className,
  textClassName,
}: {
  variant?: "header" | "footer";
  className?: string;
  textClassName?: string;
}) {
  const { settings } = useSiteSettings();
  const [failed, setFailed] = useState<string | null>(null);
  const src = (variant === "footer" ? settings?.logo_footer || settings?.logo_header : settings?.logo_header) || "";

  if (src && failed !== src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded file of unknown size/format (svg included)
      <img
        src={src}
        alt="Velmora Kids"
        className={cn("block w-auto object-contain", className)}
        onError={() => setFailed(src)}
      />
    );
  }

  return (
    <span className={cn("font-display font-bold tracking-tight text-charcoal dark:text-white", textClassName)}>
      Velmora <span className="text-primary-500">Kids</span>
    </span>
  );
}
