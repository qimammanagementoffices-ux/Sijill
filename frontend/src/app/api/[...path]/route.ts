// Dev-only reverse proxy to a remote API, so the UI can be worked on locally
// without a full local stack.
//
// A plain Next rewrite is not enough: the browser attaches
// `Origin: http://localhost:3000`, the rewrite forwards it unchanged, and
// Spring's CorsFilter refuses any request carrying a disallowed Origin with a
// 403 -- server-side, whether or not a browser is involved. Rewrites cannot
// modify headers; this can, so it drops Origin and Referer and the request
// arrives looking like a server-to-server call.
//
// Inert unless DEV_API_PROXY_TARGET is set, and in production Caddy routes
// /api/* to the API container long before Next sees it. The guard below is the
// belt to that braces.
//
//   $env:DEV_API_PROXY_TARGET="https://riyadh.sijill.digital"
//   $env:NEXT_PUBLIC_API_URL="http://localhost:3000/api/v1"
//   npm run dev
//
// Whatever this points at is REAL. Use it for styling and layout; anything
// that creates or changes records belongs on the local stack
// (docs/local-development.md).

const TARGET = process.env.DEV_API_PROXY_TARGET;

// Hop-by-hop and origin-identifying headers. Forwarding `host` would break TLS
// SNI at the far end; forwarding `origin` is the whole reason this file exists.
const STRIP = new Set(["host", "origin", "referer", "connection", "content-length"]);

async function proxy(request: Request, path: string[]) {
  if (!TARGET) {
    return new Response("Dev API proxy is not configured", { status: 404 });
  }

  const incoming = new URL(request.url);
  const target = `${TARGET}/api/${path.join("/")}${incoming.search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!STRIP.has(key.toLowerCase())) headers.set(key, value);
  });

  const method = request.method;
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

  const response = await fetch(target, { method, headers, body, redirect: "manual" });

  // Pass the body through untouched — it may be JSON, a QR PNG, or a backup
  // download, and re-encoding any of those would corrupt them.
  const passthrough = new Headers(response.headers);
  passthrough.delete("content-encoding");
  passthrough.delete("content-length");
  return new Response(response.body, { status: response.status, headers: passthrough });
}

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, context: Context) {
  return proxy(request, (await context.params).path);
}
export async function POST(request: Request, context: Context) {
  return proxy(request, (await context.params).path);
}
export async function PUT(request: Request, context: Context) {
  return proxy(request, (await context.params).path);
}
export async function PATCH(request: Request, context: Context) {
  return proxy(request, (await context.params).path);
}
export async function DELETE(request: Request, context: Context) {
  return proxy(request, (await context.params).path);
}
