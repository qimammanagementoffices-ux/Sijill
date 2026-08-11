import CostDashboard from "@/components/CostDashboard";
import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";

export default async function WarehouseCostsPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <CostDashboard domain="warehouse" dict={dict.costs} commonDict={dict.common} />;
}
