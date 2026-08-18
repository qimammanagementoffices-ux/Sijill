import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";

// Must run per-request, not at build time: it calls the backend, which
// isn't reachable during `next build` (and the answer can change at runtime
// anyway once an admin is created).
export const dynamic = "force-dynamic";

type SystemStatus = { needsOnboarding: boolean };

// Server component: asks the backend whether an admin exists yet and routes
// accordingly. Whether the visitor already holds a valid session lives in
// localStorage (client-only, see lib/auth.ts) — /login itself bounces to
// /dashboard if a token is already present, so we don't duplicate that check
// here on the server.
export default async function RootPage() {
  // The backend can briefly 502 during a deploy restart or free-tier cold
  // start -- crashing this page with a generic Next.js error screen (instead
  // of just landing on /login, which itself tolerates a slow/unavailable
  // backend) turns a few-second blip into a hard outage for every visitor.
  let needsOnboarding = false;
  try {
    // no-store, or Next caches the fetch and keeps routing to whichever
    // answer it saw first: after the first admin is created the page would
    // still send everyone to /onboarding. force-dynamic above governs the
    // route, not the fetches inside it.
    const status = await apiFetch<SystemStatus>("/system/status", { cache: "no-store" });
    needsOnboarding = status.needsOnboarding;
  } catch {
    // fall through to /login
  }
  redirect(needsOnboarding ? "/onboarding" : "/login");
}
