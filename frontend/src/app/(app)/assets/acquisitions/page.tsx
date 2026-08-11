import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import AssetAcquisitionList from "./AssetAcquisitionList";

export default async function AssetAcquisitionsPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <AssetAcquisitionList dict={dict.assetAcquisitions} commonDict={dict.common} attachmentsDict={dict.attachments} />;
}
