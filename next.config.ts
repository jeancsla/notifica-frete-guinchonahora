import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const apiOrigin = process.env.API_ORIGIN?.trim();

    if (!apiOrigin) {
      return {
        beforeFiles: [],
        afterFiles: [],
        fallback: [],
      };
    }

    let apiUrl: URL;
    try {
      apiUrl = new URL(apiOrigin);
    } catch {
      throw new Error(
        "API_ORIGIN must be a valid absolute URL, e.g. https://your-bun-api.vercel.app",
      );
    }

    const toHost = (value?: string): string | null => {
      if (!value) return null;
      const input = String(value).trim();
      if (!input) return null;

      try {
        return new URL(input).host;
      } catch {
        const host = input.replace(/^https?:\/\//, "").replace(/\/$/, "");
        return host || null;
      }
    };

    const currentHosts = new Set(
      [
        process.env.VERCEL_URL,
        process.env.VERCEL_BRANCH_URL,
        process.env.VERCEL_PROJECT_PRODUCTION_URL,
        process.env.NEXT_PUBLIC_APP_URL,
      ]
        .map(toHost)
        .filter((host): host is string => Boolean(host)),
    );

    if (currentHosts.has(apiUrl.host)) {
      throw new Error(
        "API_ORIGIN cannot point to the same host as the Next.js app; this causes an infinite /api/v1 rewrite loop.",
      );
    }

    const base = apiOrigin.replace(/\/$/, "");
    return {
      beforeFiles: [
        {
          source: "/api/v1/:path*",
          destination: `${base}/api/v1/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const securityHeaders = [
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "X-XSS-Protection",
        value: "1; mode=block",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "geolocation=(), microphone=(), camera=()",
      },
      {
        key: "Content-Security-Policy",
        value:
          "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:;",
      },
    ];

    if (isProd) {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
