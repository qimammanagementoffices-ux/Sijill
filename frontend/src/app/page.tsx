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
  const status = await apiFetch<SystemStatus>("/system/status");
  redirect(status.needsOnboarding ? "/onboarding" : "/login");
}
