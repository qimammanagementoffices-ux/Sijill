import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import OfficialHolidayCalendar from "@/components/OfficialHolidayCalendar";

export default async function OfficialHolidaysPage() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);
  return <OfficialHolidayCalendar dict={dict.siteMaintenanceAdmin} locale={locale} page />;
}
