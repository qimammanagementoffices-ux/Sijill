import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import ItemDirectory from "@/components/ItemDirectory";

export default async function MaintenancePartsPage() {
  const dict = await getDictionary(await getRequestLocale());
  return (
    <ItemDirectory
      // Same screen as warehouse items (one Domain-parameterized module),
      // so it reuses that dictionary section and overrides only the strings
      // that name the screen -- otherwise the parts page calls itself
      // "أصناف المستودع".
      dict={{ ...dict.warehouseItems, ...dict.maintenanceParts }}
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
