import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import LanguagesAdmin from "./LanguagesAdmin";

export default async function LanguagesAdminPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <LanguagesAdmin dict={dict.adminLanguages} />;
}
