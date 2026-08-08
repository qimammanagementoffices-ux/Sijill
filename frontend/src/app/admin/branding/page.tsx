import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import BrandingAdmin from "./BrandingAdmin";

export default async function BrandingAdminPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <BrandingAdmin dict={dict.branding} />;
}
