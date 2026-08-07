import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import FaultTypeAdmin from "./FaultTypeAdmin";

export default async function FaultTypesPage() {
  const dict = await getDictionary(defaultLocale);
  return <FaultTypeAdmin dict={dict.faultTypes} />;
}
