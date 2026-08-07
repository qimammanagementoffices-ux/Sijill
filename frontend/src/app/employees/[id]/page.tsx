import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import EmployeeEditView from "./EmployeeEditView";

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const dict = await getDictionary(defaultLocale);
  return <EmployeeEditView id={params.id} dict={dict.employees} errorsDict={dict.errors} />;
}
