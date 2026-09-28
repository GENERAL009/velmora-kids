"use client";

export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/home/hero-section";
import { CategoryStrip } from "@/components/home/category-strip";
import { RecommendationFeed } from "@/components/home/recommendation-feed";
import { useHeroStore } from "@/components/home/hero-section";

export default function HomePage() {
  const heroGender = useHeroStore((s) => s.gender);

  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />

      {heroGender && (
        <>
          <CategoryStrip gender={heroGender} />
          <RecommendationFeed gender={heroGender} />
        </>
      )}

      <Footer />
    </main>
  );
}
