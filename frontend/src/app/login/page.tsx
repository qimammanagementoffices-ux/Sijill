import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";

// Wired up to POST /api/v1/auth/login in Phase 2. Phone normalization
// (Saudi 05XXXXXXXX format, Arabic-Indic → Western digit conversion) must
// happen on submit here AND be re-validated server-side — see master spec §7.
export default async function LoginPage() {
  const dict = await getDictionary(defaultLocale);

  return (
    <main style={{ maxWidth: 360, margin: "10vh auto", padding: "0 1rem" }}>
      <h1>{dict.login.title}</h1>
      <form>
        <label>
          {dict.login.phoneLabel}
          <input type="tel" name="phone" inputMode="numeric" disabled />
        </label>
        <label>
          {dict.login.pinLabel}
          <input type="password" name="pin" inputMode="numeric" disabled />
        </label>
        <button type="submit" disabled>
          {dict.login.submit}
        </button>
      </form>
    </main>
  );
}
