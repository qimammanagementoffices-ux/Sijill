import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import StructureAdminView from "@/components/StructureAdminView";

export default async function DepartmentsPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <StructureAdminView dict={dict.structure} entity="departments" title={dict.structure.departmentsTitle} />;
}
