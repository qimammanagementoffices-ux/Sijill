import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import AssetRequestDetailView from "./AssetRequestDetailView";

export default async function AssetRequestDetailPage({ params }: { params: { id: string } }) {
  const dict = await getDictionary(defaultLocale);
  return <AssetRequestDetailView id={params.id} dict={dict.assetRequests} />;
}
