import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const dict = await getDictionary(await getRequestLocale());

  return (
    <main style={{ maxWidth: 360, margin: "10vh auto", padding: "0 1rem" }}>
      <h1>{dict.login.title}</h1>
      <LoginForm dict={dict.login} />
    </main>
  );
}
