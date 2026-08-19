import { redirect } from "next/navigation";
import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import { apiFetch } from "@/lib/apiClient";
import OnboardingForm from "./OnboardingForm";

// Asks the backend per request, like the root page: the answer flips the first
// time an admin is created and must not be cached.
export const dynamic = "force-dynamic";

type SystemStatus = { needsOnboarding: boolean };

export default async function OnboardingPage() {
  // Without this the first-admin form stays reachable forever. The API refuses
  // a second admin, so this is not the security boundary -- but a live "set up
  // your system" screen invites people to try, and reads as a broken site.
  let needsOnboarding = false;
  try {
    const status = await apiFetch<SystemStatus>("/system/status", { cache: "no-store" });
    needsOnboarding = status.needsOnboarding;
  } catch {
    // Backend unreachable: /login tolerates that, this form does not.
  }
  if (!needsOnboarding) redirect("/login");

  const dict = await getDictionary(await getRequestLocale());

  return (
    <main style={{ maxWidth: 420, margin: "10vh auto", padding: "0 1rem" }}>
      <h1>{dict.onboarding.welcomeTitle}</h1>
      <p>{dict.onboarding.welcomeSubtitle}</p>
      <OnboardingForm dict={dict.onboarding} errorsDict={dict.errors} />
    </main>
  );
}
