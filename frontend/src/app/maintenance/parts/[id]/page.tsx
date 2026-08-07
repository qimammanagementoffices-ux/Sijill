import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import ItemEditView from "@/components/ItemEditView";

export default async function MaintenancePartDetailPage({ params }: { params: { id: string } }) {
  const dict = await getDictionary(defaultLocale);
  return (
    <ItemEditView
      id={params.id}
      dict={dict.warehouseItems}
      attachmentsDict={dict.attachments}
      errorsDict={dict.errors}
      itemBasePath="/maintenance/parts"
      categoriesPath="/maintenance/categories"
    />
  );
}
