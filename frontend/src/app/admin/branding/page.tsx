import { getDictionary } from "@/i18n/getDictionary";
import { defaultLocale } from "@/i18n/config";
import BrandingAdmin from "./BrandingAdmin";

export default async function BrandingAdminPage() {
  const dict = await getDictionary(defaultLocale);
  return <BrandingAdmin dict={dict.branding} />;
}
