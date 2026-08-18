import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import AuditLogView from "./AuditLogView";

export default async function AuditLogPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <AuditLogView dict={dict.auditLog} commonDict={dict.common} />;
}
