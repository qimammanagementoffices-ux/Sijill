import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import AssetDetailView from "./AssetDetailView";

export default async function AssetDetailPage({ params }: { params: { id: string } }) {
  const dict = await getDictionary(await getRequestLocale());
  return (
    <AssetDetailView
      id={params.id}
      dict={dict.assets}
      attachmentsDict={dict.attachments}
      commonDict={dict.common}
    />
  );
}
