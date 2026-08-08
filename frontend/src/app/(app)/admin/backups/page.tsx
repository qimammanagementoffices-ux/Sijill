import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import BackupAdmin from "./BackupAdmin";

export default async function BackupAdminPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <BackupAdmin dict={dict.backups} />;
}
