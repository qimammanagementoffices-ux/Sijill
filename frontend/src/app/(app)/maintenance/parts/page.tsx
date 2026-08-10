import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import ItemDirectory from "@/components/ItemDirectory";

export default async function MaintenancePartsPage() {
  const dict = await getDictionary(await getRequestLocale());
  return (
    <ItemDirectory
      dict={dict.warehouseItems}
      errorsDict={dict.errors}
      commonDict={dict.common}
      categoriesModalDict={dict.categoriesModal}
      attachmentsDict={dict.attachments}
      requestsDict={dict.warehouseRequests}
      basePath="/maintenance/parts"
      categoriesPath="/maintenance/categories"
    />
  );
}
