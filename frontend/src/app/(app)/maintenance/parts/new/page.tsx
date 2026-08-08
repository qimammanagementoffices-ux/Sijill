import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import NewItemView from "@/components/NewItemView";

export default async function NewMaintenancePartPage() {
  const dict = await getDictionary(await getRequestLocale());
  return (
    <NewItemView
      dict={dict.warehouseItems}
      errorsDict={dict.errors}
      itemBasePath="/maintenance/parts"
      categoriesPath="/maintenance/categories"
    />
  );
}
