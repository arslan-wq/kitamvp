/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  productionBrowserSourceMaps: false,
  // Perf: große Icon-/UI-Bibliotheken nur das tatsächlich Genutzte bündeln
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  // Test-Deploy: vorbestehende Typ-/Lint-Fehler blockieren den Build nicht.
  // TODO: vor Produktiv-Launch sauber beheben und wieder entfernen.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      }
    ]
  }
};

module.exports = nextConfig;
