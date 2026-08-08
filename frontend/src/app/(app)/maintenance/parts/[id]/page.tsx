import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import ItemEditView from "@/components/ItemEditView";

export default async function MaintenancePartDetailPage({ params }: { params: { id: string } }) {
  const dict = await getDictionary(await getRequestLocale());
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
