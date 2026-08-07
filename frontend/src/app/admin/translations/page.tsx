import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import TranslationTable from "./TranslationTable";

export default async function AdminTranslationsPage() {
  const dict = await getDictionary(defaultLocale);
  return <TranslationTable dict={dict.adminTranslations} />;
}
