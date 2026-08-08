import { getDictionary } from "@/i18n/getDictionary";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import PermissionsOverviewView from "./PermissionsOverviewView";

export default async function PermissionsOverviewPage() {
  const dict = await getDictionary(await getRequestLocale());
  return <PermissionsOverviewView dict={dict.permissionsOverview} permissionDict={dict.permission} />;
}
