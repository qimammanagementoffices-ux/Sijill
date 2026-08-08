import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import TranslationTable from "./TranslationTable";

export default async function AdminTranslationsPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <TranslationTable dict={dict.adminTranslations} commonDict={dict.common} />;
}
