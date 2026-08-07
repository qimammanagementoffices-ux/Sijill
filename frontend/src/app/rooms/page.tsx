import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import RoomAdmin from "./RoomAdmin";

export default async function RoomsPage() {
  const dict = await getDictionary(defaultLocale);
  return <RoomAdmin dict={dict.rooms} attachmentsDict={dict.attachments} />;
}
