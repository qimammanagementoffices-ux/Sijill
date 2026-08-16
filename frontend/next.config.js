// Attachments are served from the app's own origin now (Caddy proxies /files
// to MinIO), so next/image has to be told that host is allowed -- it refuses
// to optimise any remote host not listed here, which shows up as a broken
// thumbnail while the same URL opens fine in a plain <img>.
//
// Derived from NEXT_PUBLIC_API_URL rather than hardcoded: that value is
// already passed in at build time (see frontend/Dockerfile) and points at the
// same origin, so a new domain needs no change here.
const apiHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL).hostname;
  } catch {
    return null;
  }
})();

// Dev-only proxy for looking at UI changes against a remote API.
//
// The API allows exactly one CORS origin (FRONTEND_ORIGIN), so a browser on
// http://localhost:3000 is refused before the request is even considered.
// Worse, LoginForm reports any non-ApiError as "wrong phone or PIN", so a
// blocked request looks like bad credentials.
//
// Rewriting is server-side: the browser calls its own origin and Next forwards
// the call, so CORS never enters into it. Set DEV_API_PROXY_TARGET to the API
// origin (no trailing slash), and point NEXT_PUBLIC_API_URL at this dev
// server. It must be absolute -- parts of the app fetch during SSR, where
// Node's fetch rejects a relative URL with "Failed to parse URL from /api/v1".
//
//   $env:DEV_API_PROXY_TARGET="https://riyadh.sijill.digital"
//   $env:NEXT_PUBLIC_API_URL="http://localhost:3000/api/v1"
//   npm run dev
//
// This reads and writes REAL data on whatever it points at. Use it for styling
// and layout only; anything that creates or changes records belongs on the
// local stack (docs/local-development.md).
const devApiProxyTarget = process.env.DEV_API_PROXY_TARGET;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(devApiProxyTarget
    ? {
        async rewrites() {
          return [{ source: "/api/:path*", destination: `${devApiProxyTarget}/api/:path*` }];
        },
      }
    : {}),
  // Emits .next/standalone: the server plus only the dependencies it actually
  // uses, so the container does not carry all of node_modules. Ignored by
  // `next dev` and by Render's node runtime, which still runs `npm run start`.
  output: "standalone",
  images: {
    remotePatterns: [
      ...(apiHost ? [{ protocol: "https", hostname: apiHost, pathname: "/files/**" }] : []),
      // Kept while the Supabase buckets remain as rollback; harmless once
      // they are gone.
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "http", hostname: "localhost", port: "9000", pathname: "/**" },
    ],
  },
};

module.exports = nextConfig;
