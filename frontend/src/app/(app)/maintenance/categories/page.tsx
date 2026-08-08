import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import StructureAdminView from "@/components/StructureAdminView";

export default async function MaintenanceCategoriesPage() {
  const dict = await getDictionary(await getRequestLocale());
  return (
    <StructureAdminView
      dict={dict.structure}
      commonDict={dict.common}
      entity="maintenance/categories"
      title={dict.dashboard.maintenanceCategoriesNav}
    />
  );
}
