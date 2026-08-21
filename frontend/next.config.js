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

// The dev-only proxy lives in src/app/api/[...path]/route.ts, not here: a
// rewrite cannot strip the browser's Origin header, and Spring's CorsFilter
// rejects a disallowed Origin with 403 even server-to-server.
//
// Behind that proxy NEXT_PUBLIC_API_URL points at localhost, so apiHost above
// is "localhost" and attachment URLs -- which still carry the remote host --
// are refused by next/image. Allow the proxy target's host as well. Unset in
// production, where apiHost is already the right one.
const devProxyHost = (() => {
  try {
    return new URL(process.env.DEV_API_PROXY_TARGET).hostname;
  } catch {
    return null;
  }
})();

// A local database restored from a production dump still holds attachment URLs
// on the production host, even though the API is local -- next/image then
// throws "hostname is not configured" and takes the whole page down with it.
// Allow that host for images alone: DEV_API_PROXY_TARGET would do it too, but
// it also routes every API call, writes included, at production, which defeats
// the point of having a local copy. Unset in production, where apiHost already
// covers it.
const devImageHost = (() => {
  try {
    return new URL(process.env.DEV_IMAGE_HOST).hostname;
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
      ...(devProxyHost ? [{ protocol: "https", hostname: devProxyHost, pathname: "/files/**" }] : []),
      ...(devImageHost ? [{ protocol: "https", hostname: devImageHost, pathname: "/files/**" }] : []),
      // Kept while the Supabase buckets remain as rollback; harmless once
      // they are gone.
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "http", hostname: "localhost", port: "9000", pathname: "/**" },
    ],
  },
};

module.exports = nextConfig;
