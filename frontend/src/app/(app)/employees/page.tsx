import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import EmployeeDirectory from "./EmployeeDirectory";

export default async function EmployeesPage() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);
  return (
    <EmployeeDirectory
      dict={dict.employees}
      errorsDict={dict.errors}
      permissionDict={dict.permission}
      commonDict={dict.common}
      locale={locale}
    />
  );
}
