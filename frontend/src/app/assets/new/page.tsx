import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import NewAssetView from "./NewAssetView";

export default async function NewAssetPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <NewAssetView dict={dict.assets} errorsDict={dict.errors} />;
}
