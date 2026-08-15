/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emits .next/standalone: the server plus only the dependencies it actually
  // uses, so the container does not carry all of node_modules. Ignored by
  // `next dev` and by Render's node runtime, which still runs `npm run start`.
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "http", hostname: "localhost", port: "9000", pathname: "/**" },
    ],
  },
};

module.exports = nextConfig;
