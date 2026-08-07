import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import EmployeeDirectory from "./EmployeeDirectory";

export default async function EmployeesPage() {
  const dict = await getDictionary(defaultLocale);
  return <EmployeeDirectory dict={dict.employees} />;
}
