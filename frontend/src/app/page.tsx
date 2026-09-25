"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/home/hero-section";
import { FeaturedProducts } from "@/components/home/featured-products";
import { PromoBanner } from "@/components/home/promo-banner";
import { useProducts } from "@/hooks/use-products";
import { useHeroStore } from "@/components/home/hero-section";

export default function HomePage() {
  const heroGender = useHeroStore((s) => s.gender);

  const { data: featuredData } = useProducts(
    heroGender
      ? { gender: heroGender, is_featured: true, page_size: 8, sort_by: "popular" }
      : {}
  );

  const { data: newData } = useProducts(
    heroGender
      ? { gender: heroGender, is_new: true, page_size: 8, sort_by: "newest" }
      : {}
  );

  const { data: allProductsData } = useProducts(
    heroGender
      ? { gender: heroGender, page_size: 12, sort_by: "price_asc" }
      : {}
  );

  const { data: saleProductsData } = useProducts(
    heroGender
      ? { gender: heroGender, is_on_sale: true, page_size: 8, sort_by: "newest" }
      : {}
  );

  const { data: recommendedData } = useProducts(
    heroGender
      ? { gender: heroGender, page_size: 8, sort_by: "popular" }
      : {}
  );

  const featuredProducts = featuredData?.items ?? [];
  const newArrivals = newData?.items ?? [];
  const allProducts = allProductsData?.items ?? [];
  const saleProducts = saleProductsData?.items ?? [];
  const recommendedProducts = recommendedData?.items ?? [];

  const genderLabel = heroGender === "girls" ? "девочек" : "мальчиков";

  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />

      {heroGender && (
        <>
          {featuredProducts.length > 0 && (
            <FeaturedProducts
              title={`Популярные для ${genderLabel}`}
              subtitle="Самые любимые модели наших покупателей"
              products={featuredProducts}
              viewAllHref={`/catalog?gender=${heroGender}&sort=popular`}
              viewAllLabel="Смотреть все"
            />
          )}

          {newArrivals.length > 0 && (
            <FeaturedProducts
              title={`Новинки для ${genderLabel}`}
              subtitle="Только что в нашем магазине"
              products={newArrivals}
              viewAllHref={`/catalog?gender=${heroGender}&sort=newest`}
              viewAllLabel="Все новинки"
            />
          )}

          <PromoBanner />

          {allProducts.length > 0 && (
            <FeaturedProducts
              title="Все товары"
              subtitle="По доступным ценам"
              products={allProducts}
              viewAllHref={`/catalog?gender=${heroGender}&sort=price_asc`}
              viewAllLabel="Смотреть все"
            />
          )}

          {saleProducts.length > 0 && (
            <FeaturedProducts
              title="Акции и скидки"
              subtitle="Выгодные предложения"
              products={saleProducts}
              viewAllHref={`/catalog?gender=${heroGender}&is_on_sale=true`}
              viewAllLabel="Все акции"
            />
          )}

          {recommendedProducts.length > 0 && (
            <FeaturedProducts
              title="Вам понравится"
              subtitle="Подобрали специально для вас"
              products={recommendedProducts}
              viewAllHref={`/catalog?gender=${heroGender}&sort=popular`}
              viewAllLabel="Ещё товары"
            />
          )}
        </>
      )}

      <Footer />
    </main>
  );
}
