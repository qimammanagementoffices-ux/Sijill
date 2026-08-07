import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  const dict = await getDictionary(defaultLocale);

  return (
    <main style={{ maxWidth: 420, margin: "10vh auto", padding: "0 1rem" }}>
      <h1>{dict.onboarding.welcomeTitle}</h1>
      <p>{dict.onboarding.welcomeSubtitle}</p>
      <OnboardingForm dict={dict.onboarding} errorsDict={dict.errors} />
    </main>
  );
}
