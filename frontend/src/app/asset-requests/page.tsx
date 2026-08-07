import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import AssetRequestList from "./AssetRequestList";

export default async function AssetRequestsPage() {
  const dict = await getDictionary(defaultLocale);
  return <AssetRequestList dict={dict.assetRequests} commonDict={dict.common} />;
}
