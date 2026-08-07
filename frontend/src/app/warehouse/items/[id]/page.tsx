import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import ItemEditView from "./ItemEditView";

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const dict = await getDictionary(defaultLocale);
  return <ItemEditView id={params.id} dict={dict.warehouseItems} errorsDict={dict.errors} />;
}
