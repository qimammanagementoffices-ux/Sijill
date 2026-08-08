import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import AssetRequestList from "./AssetRequestList";

export default async function AssetRequestsPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <AssetRequestList dict={dict.assetRequests} commonDict={dict.common} />;
}
