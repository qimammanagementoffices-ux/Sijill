import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";

// Empty-state onboarding: shown when the backend reports no admin exists yet
// (GET /api/v1/system/status → { needsOnboarding: true }). The actual guard
// that redirects here vs. to /login belongs in Phase 2 once auth exists —
// this page is the UI shell required by Phase 1's "empty-state onboarding" item.
export default async function OnboardingPage() {
  const dict = await getDictionary(defaultLocale);

  return (
    <main style={{ maxWidth: 420, margin: "10vh auto", padding: "0 1rem" }}>
      <h1>{dict.onboarding.welcomeTitle}</h1>
      <p>{dict.onboarding.welcomeSubtitle}</p>

      {/* Form fields (name, phone, PIN, PIN confirm) land here once
          POST /api/v1/onboarding/first-admin exists in Phase 2. */}
      <button type="button" disabled>
        {dict.onboarding.createAdmin}
      </button>
    </main>
  );
}
