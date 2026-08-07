import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import StructureAdminView from "@/components/StructureAdminView";

export default async function JobTitlesPage() {
  const dict = await getDictionary(defaultLocale);
  return <StructureAdminView dict={dict.structure} entity="job-titles" title={dict.structure.jobTitlesTitle} />;
}
