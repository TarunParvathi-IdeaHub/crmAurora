import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.231.110.130"],

  /**
   * Proxy all /api/* requests through Vercel so the browser treats cookies
   * as first-party (same-origin: crm-aurora.vercel.app).
   *
   * Without this, Vercel (crm-aurora.vercel.app) → EC2 (aurora-erp-server.duckdns.org)
   * is cross-origin, and browsers (especially Safari/Chrome) block third-party cookies
   * even with SameSite=None; Secure.
   *
   * Setup required in Vercel project settings (Environment Variables):
   *   BACKEND_URL              = https://aurora-erp-server.duckdns.org  (server-side only, NOT NEXT_PUBLIC)
   *   NEXT_PUBLIC_API_BASE_URL = https://crm-aurora.vercel.app          (must match Vercel domain)
   *
   * Setup required on EC2 (.env):
   *   CORS_ORIGIN = https://crm-aurora.vercel.app
   *   NODE_ENV    = production
   */
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
      // No BACKEND_URL set — skip rewrites (development uses direct URL)
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
