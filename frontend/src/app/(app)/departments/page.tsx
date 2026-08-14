import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import StructureAdminView from "@/components/StructureAdminView";

export default async function DepartmentsPage() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);
  return (
    <StructureAdminView
      dict={dict.structure}
      commonDict={dict.common}
      categoriesModalDict={dict.categoriesModal}
      errorsDict={dict.errors}
      entity="departments"
      title={dict.structure.departmentsTitle}
      locale={locale}
    />
  );
}
