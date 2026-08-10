"use client";

import { entityName, useEntityLocale } from "@/i18n/entityName";

// Renders a stored entity name (category, department, fault type...) in the
// interface language. A component rather than a bare helper so call sites
// don't each need the hook -- these appear inside .map() in dropdowns and
// chips, where a hook cannot go.
export default function EntityName({
  entity,
}: {
  entity: { nameAr: string; nameEn?: string | null; nameHi?: string | null };
}) {
  return <>{entityName(entity, useEntityLocale())}</>;
}
