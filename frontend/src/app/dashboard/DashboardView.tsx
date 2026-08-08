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
  const canViewWarehouse =
    employee.permissions.includes("wh.view") || employee.permissions.includes("wh.request");
  const canViewInvoices = employee.permissions.includes("wh.invoices");
  const canManageWarehouseItems = employee.permissions.includes("wh.items");
  const canManageTranslations = employee.permissions.includes("sys.translations");
  const canViewMaintenance =
    employee.permissions.includes("mt.view") || employee.permissions.includes("mt.request");
  const canViewAssets =
    employee.permissions.includes("as.view") || employee.permissions.includes("as.request");
  const canManageAssets = employee.permissions.includes("as.manage");
  const canManageBranding = employee.permissions.includes("sys.branding");
  const canManageBackups = employee.permissions.includes("sys.backup");
  const canManageSiteMaintenance = employee.permissions.includes("sys.maintenance");

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
          {canViewWarehouse && (
            <li>
              <Link href="/warehouse/items">{dict.warehouseItemsNav}</Link>
            </li>
          )}
          {canViewInvoices && (
            <li>
              <Link href="/warehouse/invoices">{dict.warehouseInvoicesNav}</Link>
            </li>
          )}
          {canViewWarehouse && (
            <li>
              <Link href="/warehouse/requests">{dict.warehouseRequestsNav}</Link>
            </li>
          )}
          {canManageWarehouseItems && (
            <li>
              <Link href="/warehouse/categories">{dict.warehouseCategoriesNav}</Link>
            </li>
          )}
          {canManageTranslations && (
            <li>
              <Link href="/admin/translations">{dict.translationsNav}</Link>
            </li>
          )}
          {canViewWarehouse && (
            <li>
              <Link href="/maintenance/parts">{dict.maintenancePartsNav}</Link>
            </li>
          )}
          {canViewInvoices && (
            <li>
              <Link href="/maintenance/invoices">{dict.maintenanceInvoicesNav}</Link>
            </li>
          )}
          {canViewMaintenance && (
            <li>
              <Link href="/maintenance/requests">{dict.maintenanceRequestsNav}</Link>
            </li>
          )}
          {canManageWarehouseItems && (
            <li>
              <Link href="/maintenance/categories">{dict.maintenanceCategoriesNav}</Link>
            </li>
          )}
          {canManageWarehouseItems && (
            <li>
              <Link href="/maintenance/fault-types">{dict.maintenanceFaultTypesNav}</Link>
            </li>
          )}
          {canViewAssets && (
            <li>
              <Link href="/rooms">{dict.roomsNav}</Link>
            </li>
          )}
          {canViewAssets && (
            <li>
              <Link href="/assets">{dict.assetsNav}</Link>
            </li>
          )}
          {canManageAssets && (
            <li>
              <Link href="/assets/categories">{dict.assetCategoriesNav}</Link>
            </li>
          )}
          {canViewAssets && (
            <li>
              <Link href="/asset-requests">{dict.assetRequestsNav}</Link>
            </li>
          )}
          {canManageBranding && (
            <li>
              <Link href="/admin/branding">{dict.brandingNav}</Link>
            </li>
          )}
          {canManageBackups && (
            <li>
              <Link href="/admin/backups">{dict.backupsNav}</Link>
            </li>
          )}
          {canManageSiteMaintenance && (
            <li>
              <Link href="/admin/site-maintenance">{dict.siteMaintenanceNav}</Link>
            </li>
          )}
          {canManageTranslations && (
            <li>
              <Link href="/admin/languages">{dict.languagesNav}</Link>
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
