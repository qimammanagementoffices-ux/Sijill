import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import EmployeeEditView from "./EmployeeEditView";

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);
  return (
    <EmployeeEditView
      id={params.id}
      dict={dict.employees}
      errorsDict={dict.errors}
      commonDict={dict.common}
      permissionDict={dict.permission}
      locale={locale}
    />
  );
}
