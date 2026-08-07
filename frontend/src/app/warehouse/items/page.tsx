import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import ItemDirectory from "@/components/ItemDirectory";

export default async function WarehouseItemsPage() {
  const dict = await getDictionary(defaultLocale);
  return <ItemDirectory dict={dict.warehouseItems} commonDict={dict.common} basePath="/warehouse/items" />;
}
