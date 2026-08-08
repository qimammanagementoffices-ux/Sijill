import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import AssetRequestDetailView from "./AssetRequestDetailView";

export default async function AssetRequestDetailPage({ params }: { params: { id: string } }) {
  const dict = await getDictionary(await getRequestLocale());
  return <AssetRequestDetailView id={params.id} dict={dict.assetRequests} />;
}
