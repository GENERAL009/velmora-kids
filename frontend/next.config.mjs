/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Lint has only style warnings (no-explicit-any etc.); type errors DO fail the build now.
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "velmora-kids.uz",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.BACKEND_URL || 'http://127.0.0.1:8000'}/api/v1/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${process.env.BACKEND_URL || 'http://127.0.0.1:8000'}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
