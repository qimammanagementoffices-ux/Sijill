import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import ItemDirectory from "@/components/ItemDirectory";

export default async function WarehouseItemsPage() {
  const dict = await getDictionary(await getRequestLocale());
  return (
    <ItemDirectory
      dict={dict.warehouseItems}
      errorsDict={dict.errors}
      commonDict={dict.common}
      categoriesModalDict={dict.categoriesModal}
      attachmentsDict={dict.attachments}
      basePath="/warehouse/items"
      categoriesPath="/warehouse/categories"
    />
  );
}
