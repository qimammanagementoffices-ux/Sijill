import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import PublicAssetView from "./PublicAssetView";

export default async function PublicAssetPage({ params }: { params: { token: string } }) {
  const dict = await getDictionary(defaultLocale);
  return <PublicAssetView token={params.token} dict={dict.publicAsset} />;
}
