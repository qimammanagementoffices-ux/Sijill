import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import DashboardView from "./DashboardView";

export default async function DashboardPage() {
  const dict = await getDictionary(defaultLocale);
  return <DashboardView dict={dict.dashboard} />;
}
