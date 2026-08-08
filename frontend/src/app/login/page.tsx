import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import { getAvailableLocales } from "@/i18n/locales";
import { getBranding } from "@/lib/getBranding";
import BrandSeal from "@/components/BrandSeal";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const locale = await getRequestLocale();
  const [dict, locales, branding] = await Promise.all([
    getDictionary(locale),
    getAvailableLocales(),
    getBranding(),
  ]);

  return (
    <main className="login-wrap">
      <div className="login-card">
        <BrandSeal logoUrl={branding.logoUrl} className="login-seal disp" />
        <h1 className="disp">{branding.platformName || dict.dashboard.appName}</h1>
        <p>{branding.subtitle || dict.dashboard.appTagline}</p>
        <LoginForm dict={dict.login} locales={locales} currentLocale={locale} />
      </div>
    </main>
  );
}
