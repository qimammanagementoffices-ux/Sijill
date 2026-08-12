"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

function AssetSparkIcon() {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9 17.5 24 9l15 8.5v17L24 43 9 34.5Z" /><path d="m9 17.5 15 8.7 15-8.7M24 26.2V43" /><path d="m17 13 15 8.7" /></svg>;
}

function MaintenanceSparkIcon() {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M29.5 9a10 10 0 0 0-9.2 13.9L9.5 33.7a3.4 3.4 0 0 0 4.8 4.8l10.8-10.8A10 10 0 0 0 39 18.5l-6 6-5.5-1.8-1.8-5.5Z" /><circle cx="13" cy="35" r="1.2" /></svg>;
}

function QuickActionCard({ tone, title, action, href, icon }: { tone: "asset" | "warehouse" | "maintenance"; title: string; action: string; href: string; icon: React.ReactNode }) {
  return <article className={`dashboard-quick-card dashboard-quick-${tone}`}>
    <span className="dashboard-quick-orb" />
    <div className="dashboard-quick-icon">{icon}</div>
    <div className="dashboard-quick-copy"><span className="dashboard-quick-kicker">{title}</span><Link href={href} className="dashboard-quick-link"><span>+</span>{action}<b aria-hidden="true">←</b></Link></div>
  </article>;
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
      .then((me) => {
        setEmployee(me);
        if (me.permissions.includes("emp.manage")) {
          return apiFetch<DashboardStats>("/dashboard/stats").then(setStats);
        }
      })
      .catch(() => {});
  }, []);

  const isAdmin = employee?.permissions.includes("emp.manage") ?? false;
  const canRequestAssets = employee?.permissions.includes("as.request") ?? false;
  const canRequestWarehouse = employee?.permissions.includes("wh.request") ?? false;
  const canRequestMaintenance = employee?.permissions.includes("mt.request") ?? false;

  return (
    <>
      <div className="eyebrow">{dict.appName}</div>
      <h1 className="section-title disp">
        {dict.welcomeMessage}
        {employee ? `, ${employee.name}` : ""}
      </h1>

      {(canRequestAssets || canRequestWarehouse || canRequestMaintenance) && <section className="dashboard-quick-section no-print">
        <div className="dashboard-quick-heading"><span />{dict.quickActionsTitle}<span /></div>
        <div className="dashboard-quick-grid">
          {canRequestAssets && <QuickActionCard tone="asset" title={dict.assetRequestsShortcut} action={dict.newAssetRequestShortcut} href="/asset-requests?new=1" icon={<AssetSparkIcon />} />}
          {canRequestWarehouse && <QuickActionCard tone="warehouse" title={dict.warehouseNeedsShortcut} action={dict.newWarehouseRequestShortcut} href="/warehouse/requests?new=1" icon={<span aria-hidden="true">▣</span>} />}
          {canRequestMaintenance && <QuickActionCard tone="maintenance" title={dict.maintenanceNeedsShortcut} action={dict.newMaintenanceRequestShortcut} href="/maintenance/requests?new=1" icon={<MaintenanceSparkIcon />} />}
        </div>
      </section>}

      {stats && isAdmin && (
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

      {stats && isAdmin && (
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

      {stats && isAdmin && (
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
