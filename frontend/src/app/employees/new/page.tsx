import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import NewEmployeeView from "./NewEmployeeView";

export default async function NewEmployeePage() {
  const dict = await getDictionary(defaultLocale);
  return <NewEmployeeView dict={dict.employees} errorsDict={dict.errors} />;
}
