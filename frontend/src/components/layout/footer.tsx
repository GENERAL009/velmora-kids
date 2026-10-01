"use client";

import React from "react";
import Link from "next/link";
import { MapPin, Phone, Mail, Star } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { useSiteSettings, safeHref, telHref } from "@/hooks/use-site-settings";
import { SiteLogo } from "@/components/layout/site-logo";

export function Footer() {
  const t = useTranslation();
  const { settings, text } = useSiteSettings();
  // while loading (or if the API is down) keep showing the built-in texts
  const fallback = !settings;
  const phones = fallback
    ? ["+998 71 200 00 00"]
    : [settings.phone_primary, settings.phone_secondary].map((p) => (p || "").trim()).filter(Boolean);
  const email = fallback ? "info@velmorakids.uz" : (settings.email || "").trim();
  const address = fallback ? t.layoutUi.address : text("address");
  const workingHours = fallback ? t.footer.workingHours : text("working_hours");
  const about = fallback ? t.footer.footerAbout : text("footer_about");
  const socials = [
    { label: "Instagram", short: "IG", href: safeHref(fallback ? "https://instagram.com/velmora.kids" : settings.instagram_url) },
    { label: "Telegram", short: "TG", href: safeHref(fallback ? "https://t.me/velmorakids" : settings.telegram_url) },
    { label: "Facebook", short: "FB", href: safeHref(fallback ? "https://facebook.com/velmorakids" : settings.facebook_url) },
    { label: "TikTok", short: "TT", href: safeHref(fallback ? "" : settings.tiktok_url) },
  ].filter((s): s is { label: string; short: string; href: string } => !!s.href);

  const aboutLinks = [
    { href: "/catalog", label: t.nav.catalog },
    { href: "/catalog?gender=girls", label: t.hero.forGirls },
    { href: "/catalog?gender=boys", label: t.hero.forBoys },
  ];

  const customerLinks = [
    { href: "/account", label: t.nav.account },
    { href: "/account/orders", label: t.nav.myOrders },
    { href: "/account/favorites", label: t.nav.favorites },
    { href: "/cart", label: t.nav.cart },
  ];


  return (
    <footer className="relative bg-neutral-50 dark:bg-neutral-900">
      {/* Decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Star className="absolute left-[10%] top-12 h-4 w-4 rotate-12 text-primary-100 dark:text-primary-900/30" />
        <Star className="absolute right-[15%] top-20 h-3 w-3 -rotate-6 text-accent-200 dark:text-accent-800/30" />
        <Star className="absolute left-[60%] top-8 h-5 w-5 rotate-45 text-secondary-100 dark:text-secondary-900/30" />
        <div className="absolute bottom-16 right-[8%] h-12 w-20 rounded-[50%] bg-primary-50/50 dark:bg-primary-950/20" />
        <div className="absolute bottom-24 left-[20%] h-8 w-14 rounded-[50%] bg-secondary-50/50 dark:bg-secondary-950/20" />
      </div>


      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* About */}
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-charcoal dark:text-white">
              {t.footer.aboutCompany}
            </h4>
            <ul className="mt-4 space-y-2.5">
              {aboutLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-500 dark:text-neutral-400 transition-colors hover:text-primary-600"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer */}
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-charcoal dark:text-white">
              {t.footer.forCustomers}
            </h4>
            <ul className="mt-4 space-y-2.5">
              {customerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-500 dark:text-neutral-400 transition-colors hover:text-primary-600"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact — managed in Admin → Sozlamalar → Kontaktlar */}
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-charcoal dark:text-white">
              {t.footer.contacts}
            </h4>
            <ul className="mt-4 space-y-3">
              {phones.length > 0 && (
                <li className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-400" />
                  <div>
                    {phones.map((phone) => (
                      <a
                        key={phone}
                        href={telHref(phone) ?? undefined}
                        className="block text-sm text-neutral-600 dark:text-neutral-400 transition-colors hover:text-primary-600"
                      >
                        {phone}
                      </a>
                    ))}
                    {workingHours && <p className="text-xs text-neutral-400">{workingHours}</p>}
                  </div>
                </li>
              )}
              {email && (
                <li className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-400" />
                  <a
                    href={`mailto:${email}`}
                    className="break-all text-sm text-neutral-600 dark:text-neutral-400 transition-colors hover:text-primary-600"
                  >
                    {email}
                  </a>
                </li>
              )}
              {address && (
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-400" />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">{address}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Social + about */}
          <div>
            {socials.length > 0 && (
              <>
                <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-charcoal dark:text-white">
                  {t.footer.socialMedia}
                </h4>
                <div className="mt-4 mb-6 flex flex-wrap gap-3">
                  {socials.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-500 dark:text-neutral-400 transition-all hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-neutral-800 hover:text-primary-600"
                      aria-label={social.label}
                      title={social.label}
                    >
                      {social.short}
                    </a>
                  ))}
                </div>
              </>
            )}
            <SiteLogo variant="footer" className="h-9 max-w-[180px]" textClassName="text-lg" />
            {about && <p className="mt-3 text-xs text-neutral-400 leading-relaxed">{about}</p>}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-neutral-200/60 dark:border-neutral-700/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-xs text-neutral-400">
            &copy; {new Date().getFullYear()} Velmora Kids. {t.footer.allRightsReserved}
          </p>
          <div className="flex items-center gap-3">
            {["Visa", "Mastercard", "Click", "Payme", "Uzum"].map(
              (method) => (
                <span
                  key={method}
                  className="rounded border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 px-2.5 py-1 text-[10px] font-medium text-neutral-400"
                >
                  {method}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
