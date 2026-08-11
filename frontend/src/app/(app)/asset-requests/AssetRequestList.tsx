"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import { exportToXlsx } from "@/lib/exportXlsx";
import PrintReportHeader from "@/components/PrintReportHeader";
import SectionLoading from "@/components/SectionLoading";
import NewAssetRequestView from "@/components/NewAssetRequestView";
import RequestActionDialog from "@/components/RequestActionDialog";
import RequestCardActivity from "@/components/RequestCardActivity";
import Toast from "@/components/Toast";
import type { AssetRequestDetail, AssetRequestListItem, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

const STATUS_STAMP_CLASS: Record<string, string> = {
  PENDING: "s-pending",
  APPROVED: "s-approved",
  POSTPONED: "s-postponed",
  REJECTED: "s-rejected",
  CLOSED: "s-closed",
};

export default function AssetRequestList({
  dict,
  errorsDict,
  commonDict,
  attachmentsDict,
}: {
  dict: Dictionary["assetRequests"];
  errorsDict: Dictionary["errors"];
  commonDict: Dictionary["common"];
  attachmentsDict: Dictionary["attachments"];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<"pending" | "all" | "mine">("pending");
  const [q, setQ] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState<PagedResponse<AssetRequestListItem> | null>(null);
  const [filtering, setFiltering] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ id: string; action: "reject" | "postpone" } | null>(null);
  const [reason, setReason] = useState("");

  function queryFor(nextView: "pending" | "all" | "mine", query: string) {
    const params = new URLSearchParams();
    if (nextView === "pending") params.set("status", "PENDING");
    if (nextView === "mine") params.set("mine", "true");
    if (query) params.set("q", query);
    return `?${params.toString()}`;
  }

  function load(nextView = view, query = appliedQuery) {
    setFiltering(true);
    apiFetch<PagedResponse<AssetRequestListItem>>(`/asset-requests${queryFor(nextView, query)}`)
      .then(setPage)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.replace("/dashboard");
        }
      })
      .finally(() => setFiltering(false));
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load("pending", "");
    apiFetch<{ permissions: string[] }>("/auth/me").then((me) => setPermissions(me.permissions)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (searchParams.get("new") === "1") setShowAddModal(true);
  }, [searchParams]);

  function statusLabel(s: string) {
    return {
      PENDING: dict.statusPending,
      APPROVED: dict.statusApproved,
      POSTPONED: dict.statusPostponed,
      REJECTED: dict.statusRejected,
      CLOSED: dict.statusClosed,
    }[s];
  }

  function actionLabel(action: string) {
    return { SUBMIT: dict.submit, APPROVE: dict.approve, REJECT: dict.reject, POSTPONE: dict.postpone, FINISH: dict.finish }[action] ?? action;
  }

  function selectView(nextView: "pending" | "all" | "mine") {
    setView(nextView);
    load(nextView);
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setAppliedQuery(q);
    load(view, q);
  }

  async function act(id: string, action: "approve" | "reject" | "postpone", actionReason?: string) {
    setBusyAction(`${id}:${action}`);
    try {
      await apiFetch(`/asset-requests/${id}/${action}`, {
        method: "POST",
        body: action === "approve" ? undefined : JSON.stringify({ reason: actionReason || null }),
      });
      setPendingAction(null);
      setReason("");
      load();
      setToast(commonDict.actionSuccess);
    } catch (error) {
      setToast(error instanceof ApiError ? error.message : errorsDict.generic);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleExport() {
    const all = await apiFetch<PagedResponse<AssetRequestListItem>>(`/asset-requests${queryFor(view, appliedQuery)}&size=10000`);
    await exportToXlsx(
      dict.title,
      dict.title,
      [
        { header: dict.columnRequester, value: (r: AssetRequestListItem) => r.requesterName },
        { header: dict.columnAsset, value: (r: AssetRequestListItem) => `${r.assetNumber} — ${r.assetNameAr}` },
        { header: dict.columnStatus, value: (r: AssetRequestListItem) => statusLabel(r.status) ?? r.status },
        { header: dict.columnSuggestedStart, value: (r: AssetRequestListItem) => r.suggestedStartDate ?? "" },
      ],
      all.content
    );
  }

  function handleAdded(request: AssetRequestDetail) {
    setShowAddModal(false);
    load();
    setToast(commonDict.actionSuccess);
    void request;
  }

  if (!page) return <SectionLoading />;

  return (
    <>
      <div className="no-print">
        <div className="eyebrow">{dict.title}</div>
        <h1 className="section-title disp">{dict.title}</h1>
      </div>
      <div className="print-only">
        <PrintReportHeader title={dict.title} dict={commonDict} />
      </div>

      <div className="panel">
        <div className="panel-head no-print">
          <div className="request-toolbar">
            <div className="request-tabs">
              <button type="button" className={`btn btn-sm ${view === "pending" ? "btn-primary" : "btn-outline"}`} onClick={() => selectView("pending")}>{dict.pendingTab}</button>
              <button type="button" className={`btn btn-sm ${view === "all" ? "btn-primary" : "btn-outline"}`} onClick={() => selectView("all")}>{dict.allTab}</button>
              <button type="button" className={`btn btn-sm ${view === "mine" ? "btn-primary" : "btn-outline"}`} onClick={() => selectView("mine")}>{dict.mineTab}</button>
            </div>
            <form className="filter-row" onSubmit={handleSearch}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={dict.searchPlaceholder} />
            </form>
            {filtering && <span className="spinner" />}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleExport}>
              {commonDict.exportXlsx}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => window.print()}>
              {commonDict.print}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
              {dict.addNew}
            </button>
          </div>
        </div>

        {page.content.length === 0 ? (
          <div className="empty">
            <b>{dict.noResults}</b>
          </div>
        ) : (
          <div className="request-cards">
            {page.content.map((request) => (
              <article key={request.id} className="request-card">
                <header className="request-card-head">
                  <h3 className="request-card-title">{dict.cardTitle} — {request.assetNameAr}</h3>
                  <span className={`stamp ${STATUS_STAMP_CLASS[request.status]}`}><span className="dot" />{statusLabel(request.status)}</span>
                </header>
                <div className="request-card-meta"><span>{request.requesterName}</span><span className="chip chip-sm">{request.assetNumber}</span></div>
                {request.reason && <p className="request-card-notes">{request.reason}</p>}
                {request.suggestedStartDate && <p className="request-card-banner">{dict.columnSuggestedStart}: <b>{request.suggestedStartDate}</b></p>}
                <RequestCardActivity actions={request.actions} actionLabel={actionLabel} activityTitle={dict.activityTitle} attachmentsDict={attachmentsDict} />
                <div className="request-card-actions">
                  {(request.status === "PENDING" || request.status === "POSTPONED") && permissions.includes("as.act.approve") && <button type="button" className="btn btn-primary btn-sm" disabled={busyAction !== null} onClick={() => void act(request.id, "approve")}>{dict.approve}</button>}
                  {(request.status === "PENDING" || request.status === "APPROVED" || request.status === "POSTPONED") && permissions.includes("as.act.reject") && <button type="button" className="btn btn-seal btn-sm" disabled={busyAction !== null} onClick={() => setPendingAction({ id: request.id, action: "reject" })}>{dict.reject}</button>}
                  {(request.status === "PENDING" || request.status === "APPROVED") && permissions.includes("as.act.postpone") && <button type="button" className="btn btn-outline btn-sm" disabled={busyAction !== null} onClick={() => setPendingAction({ id: request.id, action: "postpone" })}>{dict.postpone}</button>}
                  <Link className="btn btn-outline btn-sm" href={`/asset-requests/${request.id}`}>{dict.cardOpen}</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal wide">
            <div className="modal-head">
              <h3>{dict.addNew}</h3>
              <button type="button" className="modal-close" onClick={() => setShowAddModal(false)} aria-label="close">
                ×
              </button>
            </div>
            <div className="modal-body">
              <NewAssetRequestView
                dict={dict}
                errorsDict={errorsDict}
                onSubmitted={handleAdded}
                formId="asset-request-add-form"
                onSubmittingChange={setAddSubmitting}
              />
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAddModal(false)} disabled={addSubmitting}>
                {commonDict.cancel}
              </button>
              <button type="submit" form="asset-request-add-form" className="btn btn-primary btn-sm" disabled={addSubmitting}>
                {addSubmitting && <span className="spinner" />}
                {dict.submit}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingAction && <RequestActionDialog title={pendingAction.action === "reject" ? dict.reject : dict.postpone} reasonLabel={dict.reasonLabel} cancelLabel={commonDict.cancel} submitting={busyAction !== null} reason={reason} onReasonChange={setReason} onConfirm={() => void act(pendingAction.id, pendingAction.action, reason)} onCancel={() => { setPendingAction(null); setReason(""); }} />}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
