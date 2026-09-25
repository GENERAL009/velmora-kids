"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Send, MapPin, Phone, Mail, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

export function Footer() {
  const t = useTranslation();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const aboutLinks = [
    { href: "/catalog", label: t.nav.catalog },
    { href: "/catalog?gender=girls", label: t.hero.forGirls },
    { href: "/catalog?gender=boys", label: t.hero.forBoys },
    { href: "/catalog?gender=newborn", label: t.catalog.newborn },
  ];

  const customerLinks = [
    { href: "/account", label: t.nav.account },
    { href: "/account/orders", label: t.nav.myOrders },
    { href: "/account/favorites", label: t.nav.favorites },
    { href: "/cart", label: t.nav.cart },
  ];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setEmail("");
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

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

      {/* Newsletter */}
      <div className="border-b border-neutral-200/60 dark:border-neutral-700/60">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl text-center">
            <h3 className="font-display text-2xl font-semibold text-charcoal dark:text-white">
              {t.footer.stayUpdated}
            </h3>
            <p className="mt-2 text-sm text-neutral-500">
              {t.footer.subscribeOffer}
            </p>
            <form
              onSubmit={handleSubscribe}
              className="mt-6 flex flex-col gap-2 sm:flex-row"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.footer.yourEmail}
                required
                className="flex-1 rounded border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
              <Button type="submit" rightIcon={<Send className="h-4 w-4" />}>
                {t.footer.subscribe}
              </Button>
            </form>
            {subscribed && (
              <p className="mt-3 text-sm text-secondary-600">
                {t.footer.thanksSubscribe}
              </p>
            )}
          </div>
        </div>
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

          {/* Contact */}
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-charcoal dark:text-white">
              {t.footer.contacts}
            </h4>
            <ul className="mt-4 space-y-3">
              <li className="flex items-start gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-400" />
                <div>
                  <a
                    href="tel:+998712000000"
                    className="text-sm text-neutral-600 dark:text-neutral-400 transition-colors hover:text-primary-600"
                  >
                    +998 71 200 00 00
                  </a>
                  <p className="text-xs text-neutral-400">{t.footer.workingHours}</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-400" />
                <a
                  href="mailto:info@velmorakids.uz"
                  className="text-sm text-neutral-600 dark:text-neutral-400 transition-colors hover:text-primary-600"
                >
                  info@velmorakids.uz
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-400" />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  г. Ташкент, ул. Амира Темура, 107
                </span>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-charcoal dark:text-white">
              {t.footer.socialMedia}
            </h4>
            <div className="mt-4 flex gap-3">
              {[
                { label: "Instagram", href: "https://instagram.com/velmora.kids" },
                { label: "Telegram", href: "https://t.me/velmorakids" },
                { label: "Facebook", href: "https://facebook.com/velmorakids" },
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-500 dark:text-neutral-400 transition-all hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-neutral-800 hover:text-primary-600"
                  aria-label={social.label}
                >
                  {social.label.charAt(0)}
                </a>
              ))}
            </div>
            <p className="mt-6 text-xs text-neutral-400 leading-relaxed">
              {t.footer.footerAbout}
            </p>
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
