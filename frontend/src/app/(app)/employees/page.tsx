import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import EmployeeDirectory from "./EmployeeDirectory";

export default async function EmployeesPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <EmployeeDirectory dict={dict.employees} />;
}
