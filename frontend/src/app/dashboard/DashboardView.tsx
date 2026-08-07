"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

// Minimal authenticated shell — nav grows here as later phases add features
// (warehouse/maintenance/assets). Phase 2b adds the employee-management
// links, shown only when the logged-in employee actually holds the
// relevant permission (server still enforces this regardless).
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

  const canViewEmployees =
    employee.permissions.includes("emp.view") || employee.permissions.includes("emp.manage");
  const canManageStructure = employee.permissions.includes("emp.structure");

  return (
    <main style={{ maxWidth: 480, margin: "10vh auto", padding: "0 1rem" }}>
      <h1>
        {dict.welcomeMessage}, {employee.name}
      </h1>
      <p>{employee.employeeNumber}</p>

      <nav>
        <ul>
          {canViewEmployees && (
            <li>
              <Link href="/employees">{dict.employeesNav}</Link>
            </li>
          )}
          {canManageStructure && (
            <li>
              <Link href="/departments">{dict.departmentsNav}</Link>
            </li>
          )}
          {canManageStructure && (
            <li>
              <Link href="/job-titles">{dict.jobTitlesNav}</Link>
            </li>
          )}
        </ul>
      </nav>

      <button type="button" onClick={handleLogout}>
        {dict.logout}
      </button>
    </main>
  );
}
