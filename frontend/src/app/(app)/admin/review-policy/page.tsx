import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import ReviewPolicyAdmin from "./ReviewPolicyAdmin";

export default async function ReviewPolicyAdminPage() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);
  return <ReviewPolicyAdmin dict={dict.reviewPolicy} commonDict={dict.common} errorsDict={dict.errors} />;
}
