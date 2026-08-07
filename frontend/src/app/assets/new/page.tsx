import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import NewAssetView from "./NewAssetView";

export default async function NewAssetPage() {
  const dict = await getDictionary(defaultLocale);
  return <NewAssetView dict={dict.assets} errorsDict={dict.errors} />;
}
