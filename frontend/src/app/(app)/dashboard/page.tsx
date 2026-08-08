import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import DashboardView from "./DashboardView";

export default async function DashboardPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <DashboardView dict={dict.dashboard} />;
}
