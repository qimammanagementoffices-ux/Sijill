import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import PublicAssetView from "./PublicAssetView";

export default async function PublicAssetPage({ params }: { params: { token: string } }) {
  const dict = await getDictionary(await getRequestLocale());
  return <PublicAssetView token={params.token} dict={dict.publicAsset} />;
}
