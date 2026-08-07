import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const dict = await getDictionary(defaultLocale);

  return (
    <main style={{ maxWidth: 360, margin: "10vh auto", padding: "0 1rem" }}>
      <h1>{dict.login.title}</h1>
      <LoginForm dict={dict.login} />
    </main>
  );
}
