import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import FaultTypeAdmin from "./FaultTypeAdmin";

export default async function FaultTypesPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <FaultTypeAdmin dict={dict.faultTypes} commonDict={dict.common} />;
}
