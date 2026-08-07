import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import NewItemView from "./NewItemView";

export default async function NewItemPage() {
  const dict = await getDictionary(defaultLocale);
  return <NewItemView dict={dict.warehouseItems} errorsDict={dict.errors} />;
}
