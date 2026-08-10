import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import RoomAdmin from "./RoomAdmin";

export default async function RoomsPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <RoomAdmin dict={dict.rooms} attachmentsDict={dict.attachments} commonDict={dict.common} categoriesModalDict={dict.categoriesModal} errorsDict={dict.errors} />;
}
