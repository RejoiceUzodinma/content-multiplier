import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(:path*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel.com vercel.live; style-src 'self' 'unsafe-inline'; font-src 'self' *.vercel.app *.gstatic.com vercel.live https://*.public.blob.vercel-storage.com data:; img-src 'self' data: blob:; connect-src 'self' *.supabase.co *.vercel-storage.com;"
          },
        ],
      },
    ]
  },
};

export default nextConfig;