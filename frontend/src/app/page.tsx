import { redirect } from "next/navigation";

// Phase 1: always send to onboarding since there's no backend status check yet.
// Phase 2 replaces this with: fetch /api/v1/system/status, then redirect to
// /onboarding (no admin exists) or /login (admin exists) accordingly.
export default function RootPage() {
  redirect("/onboarding");
}
