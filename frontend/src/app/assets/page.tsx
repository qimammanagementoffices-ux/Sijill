import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import AssetDirectory from "./AssetDirectory";

export default async function AssetsPage() {
  const dict = await getDictionary(defaultLocale);
  return <AssetDirectory dict={dict.assets} commonDict={dict.common} />;
}
