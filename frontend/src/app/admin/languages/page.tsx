import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import LanguagesAdmin from "./LanguagesAdmin";

export default async function LanguagesAdminPage() {
  const dict = await getDictionary(defaultLocale);
  return <LanguagesAdmin dict={dict.adminLanguages} />;
}
