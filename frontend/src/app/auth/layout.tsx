import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Вход | Velmora Kids",
  description: "Войдите в свой аккаунт Velmora Kids",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-cream via-primary-50/30 to-secondary-50/30">
      {/* Background Pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(199,125,125,0.05),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(125,175,142,0.05),transparent_50%)]" />

      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  );
}
