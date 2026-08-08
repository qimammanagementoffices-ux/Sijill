import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import AssetDirectory from "./AssetDirectory";

export default async function AssetsPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <AssetDirectory dict={dict.assets} commonDict={dict.common} />;
}
