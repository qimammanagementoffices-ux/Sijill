import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import StructureAdminView from "@/components/StructureAdminView";

export default async function DepartmentsPage() {
  const dict = await getDictionary(defaultLocale);
  return <StructureAdminView dict={dict.structure} entity="departments" title={dict.structure.departmentsTitle} />;
}
