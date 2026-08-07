import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import CustodyReportView from "./CustodyReportView";

export default async function CustodyReportPage() {
  const dict = await getDictionary(defaultLocale);
  return <CustodyReportView dict={dict.assets} />;
}
