import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import BackupAdmin from "./BackupAdmin";

export default async function BackupAdminPage() {
  const dict = await getDictionary(defaultLocale);
  return <BackupAdmin dict={dict.backups} />;
}
