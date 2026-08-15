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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
