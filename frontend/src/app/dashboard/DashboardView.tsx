"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { clearToken, getToken } from "@/lib/auth";
import type { Dictionary } from "@/i18n/getDictionary";

type EmployeeSummary = {
  id: string;
  employeeNumber: string;
  name: string;
  phone: string;
  permissions: string[];
};

// Minimal authenticated shell for Phase 2a — no feature UI yet. Employee
// directory / permission grid land in Phase 2b; warehouse/maintenance/assets
// are later phases per the master spec's build sequence.
export default function DashboardView({ dict }: { dict: Dictionary["dashboard"] }) {
  const router = useRouter();
  const [employee, setEmployee] = useState<EmployeeSummary | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    apiFetch<EmployeeSummary>("/auth/me")
      .then(setEmployee)
      .catch(() => router.replace("/login"));
  }, [router]);

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  if (!employee) return null;

  return (
    <main style={{ maxWidth: 480, margin: "10vh auto", padding: "0 1rem" }}>
      <h1>
        {dict.welcomeMessage}, {employee.name}
      </h1>
      <p>{employee.employeeNumber}</p>
      <button type="button" onClick={handleLogout}>
        {dict.logout}
      </button>
    </main>
  );
}
