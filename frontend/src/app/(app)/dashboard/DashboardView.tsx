"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { Dictionary } from "@/i18n/getDictionary";

type EmployeeSummary = { name: string; permissions: string[] };

type DashboardStats = {
  warehouse: { itemCount: number; totalQuantity: number; lowStockCount: number; pendingRequestCount: number };
  maintenance: { openCount: number; inProgressCount: number; completedCount: number; urgentOpenCount: number };
  assets: { roomCount: number; assetCount: number; pendingRequestCount: number };
};

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="stat-card">
      <span className="bar" style={{ background: color }} />
      <div className="num">{value}</div>
      <div className="lbl">{label}</div>
    </div>
  );
}

// AppShell (the persistent sidebar/topbar layout wrapping this page, see
// app/(app)/layout.tsx) already handles auth/redirect and the nav -- this
// is just the page content inside .content. Fetches its own copy of the
// employee summary rather than threading it down from AppShell, since a
// route-group layout and its page content don't share client state without
// adding a context just for this.
export default function DashboardView({
  dict,
  statsDict,
}: {
  dict: Dictionary["dashboard"];
  statsDict: Dictionary["dashboardStats"];
}) {
  const [employee, setEmployee] = useState<EmployeeSummary | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    apiFetch<EmployeeSummary>("/auth/me")
      .then(setEmployee)
      .catch(() => {});
    apiFetch<DashboardStats>("/dashboard/stats")
      .then(setStats)
      .catch(() => {});
  }, []);

  const canViewWarehouse =
    !!employee && (employee.permissions.includes("wh.view") || employee.permissions.includes("wh.request"));
  const canViewMaintenance =
    !!employee && (employee.permissions.includes("mt.view") || employee.permissions.includes("mt.request"));
  const canViewAssets =
    !!employee && (employee.permissions.includes("as.view") || employee.permissions.includes("as.request"));

  return (
    <>
      <div className="eyebrow">{dict.appName}</div>
      <h1 className="section-title disp">
        {dict.welcomeMessage}
        {employee ? `, ${employee.name}` : ""}
      </h1>

      {stats && canViewWarehouse && (
        <div style={{ marginTop: 20 }}>
          <h2 className="disp" style={{ fontSize: 18, marginBottom: 4 }}>
            {statsDict.warehouseTitle}
          </h2>
          <p className="section-desc">{statsDict.warehouseSubtitle}</p>
          <div className="cards-row">
            <StatCard value={stats.warehouse.itemCount} label={statsDict.warehouseItemCount} color="var(--ink)" />
            <StatCard
              value={stats.warehouse.totalQuantity}
              label={statsDict.warehouseTotalQuantity}
              color="var(--sage)"
            />
            <StatCard
              value={stats.warehouse.lowStockCount}
              label={statsDict.warehouseLowStock}
              color="var(--amber)"
            />
            <StatCard
              value={stats.warehouse.pendingRequestCount}
              label={statsDict.warehousePendingRequests}
              color="var(--seal)"
            />
          </div>
        </div>
      )}

      {stats && canViewMaintenance && (
        <div style={{ marginTop: 8 }}>
          <h2 className="disp" style={{ fontSize: 18, marginBottom: 4 }}>
            {statsDict.maintenanceTitle}
          </h2>
          <p className="section-desc">{statsDict.maintenanceSubtitle}</p>
          <div className="cards-row">
            <StatCard value={stats.maintenance.openCount} label={statsDict.maintenanceOpen} color="var(--seal)" />
            <StatCard
              value={stats.maintenance.inProgressCount}
              label={statsDict.maintenanceInProgress}
              color="var(--sage)"
            />
            <StatCard
              value={stats.maintenance.completedCount}
              label={statsDict.maintenanceCompleted}
              color="var(--sage)"
            />
            <StatCard
              value={stats.maintenance.urgentOpenCount}
              label={statsDict.maintenanceUrgent}
              color="var(--amber)"
            />
          </div>
        </div>
      )}

      {stats && canViewAssets && (
        <div style={{ marginTop: 8 }}>
          <h2 className="disp" style={{ fontSize: 18, marginBottom: 4 }}>
            {statsDict.assetsTitle}
          </h2>
          <p className="section-desc">{statsDict.assetsSubtitle}</p>
          <div className="cards-row">
            <StatCard value={stats.assets.pendingRequestCount} label={statsDict.assetsPendingRequests} color="var(--amber)" />
            <StatCard value={stats.assets.assetCount} label={statsDict.assetsAssets} color="var(--sage)" />
            <StatCard value={stats.assets.roomCount} label={statsDict.assetsRooms} color="var(--sage)" />
          </div>
        </div>
      )}
    </>
  );
}
