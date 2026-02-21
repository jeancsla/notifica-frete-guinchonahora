module.exports = {
  reactStrictMode: true,
  async rewrites() {
    const apiOrigin =
      process.env.API_ORIGIN ||
      (process.env.NODE_ENV === "production" ? null : "http://localhost:4000");

    if (!apiOrigin) {
      throw new Error(
        "API_ORIGIN is required in production to route /api/v1/* to Bun API.",
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
          "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:;",
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
