import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import ItemDirectory from "@/components/ItemDirectory";

export default async function MaintenancePartsPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <ItemDirectory dict={dict.warehouseItems} commonDict={dict.common} basePath="/maintenance/parts" />;
}
