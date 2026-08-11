import CostDashboard from "@/components/CostDashboard";
import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";

export default async function MaintenanceCostsPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <CostDashboard domain="maintenance" dict={dict.costs} commonDict={dict.common} />;
}
