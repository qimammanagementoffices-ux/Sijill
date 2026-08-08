import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import { getAvailableLocales } from "@/i18n/locales";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const locale = await getRequestLocale();
  const [dict, locales] = await Promise.all([getDictionary(locale), getAvailableLocales()]);

  return (
    <main className="login-wrap">
      <div className="login-card">
        <div className="login-seal disp">س</div>
        <h1 className="disp">{dict.dashboard.appName}</h1>
        <p>{dict.dashboard.appTagline}</p>
        <LoginForm dict={dict.login} locales={locales} currentLocale={locale} />
      </div>
    </main>
  );
}
