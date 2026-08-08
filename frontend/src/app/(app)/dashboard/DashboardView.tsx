"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { Dictionary } from "@/i18n/getDictionary";

type EmployeeSummary = { name: string };

// AppShell (the persistent sidebar/topbar layout wrapping this page, see
// app/(app)/layout.tsx) already handles auth/redirect and the nav -- this
// is just the page content inside .content. Fetches its own copy of the
// employee summary rather than threading it down from AppShell, since a
// route-group layout and its page content don't share client state without
// adding a context just for this.
export default function DashboardView({ dict }: { dict: Dictionary["dashboard"] }) {
  const [employee, setEmployee] = useState<EmployeeSummary | null>(null);

  useEffect(() => {
    apiFetch<EmployeeSummary>("/auth/me")
      .then(setEmployee)
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="eyebrow">{dict.appName}</div>
      <h1 className="section-title disp">
        {dict.welcomeMessage}
        {employee ? `, ${employee.name}` : ""}
      </h1>
    </>
  );
}
