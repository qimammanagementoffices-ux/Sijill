import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import StructureAdminView from "@/components/StructureAdminView";

export default async function JobTitlesPage() {
  const dict = await getDictionary(await getRequestLocale());
  return (
    <StructureAdminView
      dict={dict.structure}
      commonDict={dict.common}
      entity="job-titles"
      title={dict.structure.jobTitlesTitle}
    />
  );
}
