import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import NewEmployeeView from "./NewEmployeeView";

export default async function NewEmployeePage() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);
  return (
    <NewEmployeeView dict={dict.employees} errorsDict={dict.errors} permissionDict={dict.permission} locale={locale} />
  );
}
