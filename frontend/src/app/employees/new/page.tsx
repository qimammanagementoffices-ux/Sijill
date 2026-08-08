import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import NewEmployeeView from "./NewEmployeeView";

export default async function NewEmployeePage() {
  const dict = await getDictionary(await getRequestLocale());
  return <NewEmployeeView dict={dict.employees} errorsDict={dict.errors} />;
}
