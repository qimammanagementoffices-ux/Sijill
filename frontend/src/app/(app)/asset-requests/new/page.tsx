import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import NewAssetRequestView from "./NewAssetRequestView";

export default async function NewAssetRequestPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <NewAssetRequestView dict={dict.assetRequests} errorsDict={dict.errors} />;
}
