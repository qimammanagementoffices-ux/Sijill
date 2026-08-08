import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import CustodyReportView from "./CustodyReportView";

export default async function CustodyReportPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <CustodyReportView dict={dict.assets} commonDict={dict.common} />;
}
