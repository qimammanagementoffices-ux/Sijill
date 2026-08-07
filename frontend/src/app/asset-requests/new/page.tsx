import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import NewAssetRequestView from "./NewAssetRequestView";

export default async function NewAssetRequestPage() {
  const dict = await getDictionary(defaultLocale);
  return <NewAssetRequestView dict={dict.assetRequests} errorsDict={dict.errors} />;
}
