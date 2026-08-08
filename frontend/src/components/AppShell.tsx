"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { clearToken, getToken } from "@/lib/auth";
import type { Dictionary } from "@/i18n/getDictionary";
import type { LocaleInfo } from "@/i18n/locales";
import type { BrandingDto } from "@/lib/types";
import LocaleSwitcher from "./LocaleSwitcher";
import BrandSeal from "./BrandSeal";

type EmployeeSummary = {
  id: string;
  employeeNumber: string;
  name: string;
  phone: string;
  permissions: string[];
};

// Persistent sidebar + topbar wrapping every route under app/(app)/ -- the
// app previously had no shared shell at all: every page below /dashboard
// was a standalone island with no navigation chrome, reachable only via
// browser back or typing a URL. This is the single highest-impact piece of
// the visual redesign since it wraps the entire authenticated app at once.
export default function AppShell({
  dict,
  locales,
  currentLocale,
  branding,
  children,
}: {
  dict: Dictionary["dashboard"];
  locales: LocaleInfo[];
  currentLocale: string;
  branding: BrandingDto;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [employee, setEmployee] = useState<EmployeeSummary | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    apiFetch<EmployeeSummary>("/auth/me")
      .then(setEmployee)
      .catch(() => router.replace("/login"));
  }, [router]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  // A blank page while /auth/me is in flight (which can take a few seconds
  // against a cold-started free-tier backend) read as "did my click even
  // land" -- show a spinner instead of nothing.
  if (!employee) {
    return (
      <div className="full-page-loading">
        <span className="spinner spinner-lg" />
      </div>
    );
  }

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

  const navGroups: { eyebrow?: string; items: { href: string; label: string }[] }[] = [
    { items: [{ href: "/dashboard", label: dict.dashboardNav }] },
    {
      items: [
        ...(canViewEmployees ? [{ href: "/employees", label: dict.employeesNav }] : []),
        ...(canManageStructure ? [{ href: "/departments", label: dict.departmentsNav }] : []),
        ...(canManageStructure ? [{ href: "/job-titles", label: dict.jobTitlesNav }] : []),
      ],
    },
    {
      items: [
        ...(canViewWarehouse ? [{ href: "/warehouse/items", label: dict.warehouseItemsNav }] : []),
        ...(canViewInvoices ? [{ href: "/warehouse/invoices", label: dict.warehouseInvoicesNav }] : []),
        ...(canViewWarehouse ? [{ href: "/warehouse/requests", label: dict.warehouseRequestsNav }] : []),
        ...(canManageWarehouseItems ? [{ href: "/warehouse/categories", label: dict.warehouseCategoriesNav }] : []),
      ],
    },
    {
      items: [
        ...(canViewWarehouse ? [{ href: "/maintenance/parts", label: dict.maintenancePartsNav }] : []),
        ...(canViewInvoices ? [{ href: "/maintenance/invoices", label: dict.maintenanceInvoicesNav }] : []),
        ...(canViewMaintenance ? [{ href: "/maintenance/requests", label: dict.maintenanceRequestsNav }] : []),
        ...(canManageWarehouseItems ? [{ href: "/maintenance/categories", label: dict.maintenanceCategoriesNav }] : []),
        ...(canManageWarehouseItems
          ? [{ href: "/maintenance/fault-types", label: dict.maintenanceFaultTypesNav }]
          : []),
      ],
    },
    {
      items: [
        ...(canViewAssets ? [{ href: "/rooms", label: dict.roomsNav }] : []),
        ...(canViewAssets ? [{ href: "/assets", label: dict.assetsNav }] : []),
        ...(canManageAssets ? [{ href: "/assets/categories", label: dict.assetCategoriesNav }] : []),
        ...(canViewAssets ? [{ href: "/asset-requests", label: dict.assetRequestsNav }] : []),
      ],
    },
    {
      eyebrow: dict.adminEyebrow,
      items: [
        ...(canManageTranslations ? [{ href: "/admin/translations", label: dict.translationsNav }] : []),
        ...(canManageTranslations ? [{ href: "/admin/languages", label: dict.languagesNav }] : []),
        ...(canManageBranding ? [{ href: "/admin/branding", label: dict.brandingNav }] : []),
        ...(canManageBackups ? [{ href: "/admin/backups", label: dict.backupsNav }] : []),
        ...(canManageSiteMaintenance ? [{ href: "/admin/site-maintenance", label: dict.siteMaintenanceNav }] : []),
      ],
    },
  ].filter((g) => g.items.length > 0);

  // Pick the single longest href that matches the current path (e.g. on
  // /assets/categories, prefer that exact nav entry over the broader
  // /assets one it would otherwise also match via startsWith) rather than
  // letting every ancestor route light up at once.
  const activeHref = navGroups
    .flatMap((g) => g.items)
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname?.startsWith(href + "/"))
    .sort((a, b) => b.length - a.length)[0];

  const initial = employee.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div id="app">
      {navOpen && <div className="nav-backdrop no-print" onClick={() => setNavOpen(false)} />}
      <aside className={`sidebar no-print${navOpen ? " open" : ""}`}>
        <div className="brand">
          <BrandSeal logoUrl={branding.logoUrl} className="brand-seal" />
          <h1 className="disp">
            {[branding.platformName || dict.appName, branding.schoolName].filter(Boolean).join(" — ")}
          </h1>
          <p>{branding.subtitle || dict.appTagline}</p>
        </div>
        <nav className="nav">
          {navGroups.map((group, i) => (
            <div key={i}>
              {group.eyebrow && <div className="nav-label-eyebrow">{group.eyebrow}</div>}
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item${item.href === activeHref ? " active" : ""}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">{employee.employeeNumber}</div>
      </aside>

      <div className="main">
        <header className="topbar no-print">
          <button type="button" className="menu-btn" onClick={() => setNavOpen((v) => !v)} aria-label="Menu">
            ☰
          </button>
          <div className="topbar-right" style={{ marginInlineStart: "auto" }}>
            <LocaleSwitcher locales={locales} current={currentLocale} />
            <div className="avatar" title={employee.name}>
              {initial}
            </div>
            <button type="button" className="logout-btn" onClick={handleLogout}>
              {dict.logout}
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
