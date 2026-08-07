import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import AssetDetailView from "./AssetDetailView";

export default async function AssetDetailPage({ params }: { params: { id: string } }) {
  const dict = await getDictionary(defaultLocale);
  return <AssetDetailView id={params.id} dict={dict.assets} attachmentsDict={dict.attachments} />;
}
