"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import type { Dictionary } from "@/i18n/getDictionary";
import NewAssetRequestView from "@/components/NewAssetRequestView";
import NewMaintenanceRequestView from "@/components/NewMaintenanceRequestView";
import NewRequestView from "@/components/NewRequestView";

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

function QuickActionCard({ tone, title, action, onOpen, icon }: { tone: "asset" | "warehouse" | "maintenance"; title: string; action: string; onOpen: () => void; icon: React.ReactNode }) {
  return <article className={`dashboard-quick-card dashboard-quick-${tone}`}>
    <span className="dashboard-quick-orb" />
    <div className="dashboard-quick-icon">{icon}</div>
    <div className="dashboard-quick-copy"><span className="dashboard-quick-kicker">{title}</span><button type="button" onClick={onOpen} className="dashboard-quick-link"><span>+</span>{action}<b aria-hidden="true">←</b></button></div>
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
  assetRequestsDict,
  maintenanceRequestsDict,
  warehouseRequestsDict,
  commonDict,
  errorsDict,
  attachmentsDict,
}: {
  dict: Dictionary["dashboard"];
  statsDict: Dictionary["dashboardStats"];
  assetRequestsDict: Dictionary["assetRequests"];
  maintenanceRequestsDict: Dictionary["maintenanceRequests"];
  warehouseRequestsDict: Dictionary["warehouseRequests"];
  commonDict: Dictionary["common"];
  errorsDict: Dictionary["errors"];
  attachmentsDict: Dictionary["attachments"];
}) {
  const router = useRouter();
  const [employee, setEmployee] = useState<EmployeeSummary | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [quickModal, setQuickModal] = useState<"asset" | "warehouse" | "maintenance" | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

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

  function closeQuickModal() {
    if (!formSubmitting) setQuickModal(null);
  }

  function finishRequest(path: string) {
    setQuickModal(null);
    setFormSubmitting(false);
    router.push(path);
  }

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
          {canRequestAssets && <QuickActionCard tone="asset" title={dict.assetRequestsShortcut} action={dict.newAssetRequestShortcut} onOpen={() => setQuickModal("asset")} icon={<AssetSparkIcon />} />}
          {canRequestWarehouse && <QuickActionCard tone="warehouse" title={dict.warehouseNeedsShortcut} action={dict.newWarehouseRequestShortcut} onOpen={() => setQuickModal("warehouse")} icon={<span aria-hidden="true">▣</span>} />}
          {canRequestMaintenance && <QuickActionCard tone="maintenance" title={dict.maintenanceNeedsShortcut} action={dict.newMaintenanceRequestShortcut} onOpen={() => setQuickModal("maintenance")} icon={<MaintenanceSparkIcon />} />}
        </div>
      </section>}

      {quickModal === "asset" && (
        <div className="overlay" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) closeQuickModal(); }}>
          <div className="modal wide">
            <div className="modal-head"><h3>{assetRequestsDict.addNew}</h3><button type="button" className="modal-close" onClick={closeQuickModal} aria-label="close" disabled={formSubmitting}>×</button></div>
            <div className="modal-body"><NewAssetRequestView dict={assetRequestsDict} errorsDict={errorsDict} onSubmitted={() => finishRequest("/asset-requests")} formId="dashboard-asset-request-form" onSubmittingChange={setFormSubmitting} /></div>
            <div className="modal-foot"><button type="button" className="btn btn-outline btn-sm" onClick={closeQuickModal} disabled={formSubmitting}>{commonDict.cancel}</button><button type="submit" form="dashboard-asset-request-form" className="btn btn-primary btn-sm" disabled={formSubmitting}>{formSubmitting && <span className="spinner" />}{assetRequestsDict.submit}</button></div>
          </div>
        </div>
      )}

      {quickModal === "maintenance" && (
        <div className="overlay maintenance-request-overlay" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) closeQuickModal(); }}>
          <div className="modal wide maintenance-request-modal">
            <div className="modal-head"><h3>{maintenanceRequestsDict.addNew}</h3><button type="button" className="modal-close" onClick={closeQuickModal} aria-label="close" disabled={formSubmitting}>×</button></div>
            <div className="modal-body"><NewMaintenanceRequestView dict={maintenanceRequestsDict} attachmentsDict={attachmentsDict} errorsDict={errorsDict} onSubmitted={() => finishRequest("/maintenance/requests")} formId="dashboard-maintenance-request-form" onSubmittingChange={setFormSubmitting} /></div>
            <div className="modal-foot"><button type="button" className="btn btn-outline btn-sm" onClick={closeQuickModal} disabled={formSubmitting}>{commonDict.cancel}</button><button type="submit" form="dashboard-maintenance-request-form" className="btn btn-seal btn-sm" disabled={formSubmitting}>{formSubmitting && <span className="spinner" />}{maintenanceRequestsDict.submit}<span aria-hidden="true">✓</span></button></div>
          </div>
        </div>
      )}

      {quickModal === "warehouse" && (
        <div className="overlay" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) closeQuickModal(); }}>
          <div className="modal wide">
            <div className="modal-head"><h3>{warehouseRequestsDict.addNew}</h3><button type="button" className="modal-close" onClick={closeQuickModal} aria-label="close" disabled={formSubmitting}>×</button></div>
            <div className="modal-body"><NewRequestView dict={warehouseRequestsDict} commonDict={commonDict} errorsDict={errorsDict} onSubmitted={() => finishRequest("/warehouse/requests")} onSubmittingChange={setFormSubmitting} onCancel={closeQuickModal} /></div>
          </div>
        </div>
      )}

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
