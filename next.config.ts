import type { NextConfig } from "next";
import { brand } from "./src/lib/brand";

function resolveAllowedDevOrigins(): string[] | undefined {
  if (process.env.NODE_ENV !== "development") return undefined;

  const origins = new Set<string>([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);

  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (configuredAppUrl) origins.add(configuredAppUrl);

  const extraOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  for (const origin of extraOrigins) {
    origins.add(origin);
    // Next.js 16 Turbopack may match on bare hostname only
    try { origins.add(new URL(origin).hostname); } catch {}
  }

  return Array.from(origins);
}

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: resolveAllowedDevOrigins(),
  logging: {
    incomingRequests: false,
  },
  serverExternalPackages: ['node-vibrant', 'apify-client'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    }
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: brand.legacyDomains.adstudioClick,
          },
        ],
        destination: `${brand.appUrl}/:path*`,
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: brand.legacyDomains.wwwAdstudioClick,
          },
        ],
        destination: `${brand.appUrl}/:path*`,
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: brand.legacyDomains.adstudioCom,
          },
        ],
        destination: `${brand.appUrl}/:path*`,
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: brand.legacyDomains.wwwAdstudioCom,
          },
        ],
        destination: `${brand.appUrl}/:path*`,
        permanent: true,
      },
      {
        source: '/admin/legacy-compositions',
        destination: '/admin/compositions',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
