import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import NewItemView from "@/components/NewItemView";

export default async function NewMaintenancePartPage() {
  const dict = await getDictionary(defaultLocale);
  return (
    <NewItemView
      dict={dict.warehouseItems}
      errorsDict={dict.errors}
      itemBasePath="/maintenance/parts"
      categoriesPath="/maintenance/categories"
    />
  );
}
