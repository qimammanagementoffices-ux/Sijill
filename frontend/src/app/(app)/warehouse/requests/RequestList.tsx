"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import { exportToXlsx } from "@/lib/exportXlsx";
import PrintReportHeader from "@/components/PrintReportHeader";
import SectionLoading from "@/components/SectionLoading";
import NewRequestView from "@/components/NewRequestView";
import RequestActionDialog from "@/components/RequestActionDialog";
import RequestCardActivity from "@/components/RequestCardActivity";
import Toast from "@/components/Toast";
import type { NeedRequestDetail, NeedRequestListItem, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

const STATUSES = ["PENDING", "APPROVED", "POSTPONED", "REJECTED", "CLOSED"] as const;
const STATUS_STAMP_CLASS: Record<string, string> = {
  PENDING: "s-pending",
  APPROVED: "s-approved",
  POSTPONED: "s-postponed",
  REJECTED: "s-rejected",
  CLOSED: "s-closed",
};

export default function RequestList({
  dict,
  errorsDict,
  commonDict,
  attachmentsDict,
}: {
  dict: Dictionary["warehouseRequests"];
  errorsDict: Dictionary["errors"];
  commonDict: Dictionary["common"];
  attachmentsDict: Dictionary["attachments"];
}) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState<PagedResponse<NeedRequestListItem> | null>(null);
  const [filtering, setFiltering] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [, setAddSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ id: string; action: "reject" | "postpone" } | null>(null);
  const [reason, setReason] = useState("");

  function load(statusFilter: string) {
    const query = statusFilter ? `?status=${statusFilter}` : "";
    setFiltering(true);
    apiFetch<PagedResponse<NeedRequestListItem>>(`/warehouse/requests${query}`)
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
    load("");
    apiFetch<{ permissions: string[] }>("/auth/me")
      .then((me) => setPermissions(me.permissions))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

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
    return {
      SUBMIT: dict.submit,
      APPROVE: dict.approve,
      REJECT: dict.reject,
      POSTPONE: dict.postpone,
      FINISH: dict.finish,
    }[action] ?? action;
  }

  async function act(id: string, action: "approve" | "reject" | "postpone", actionReason?: string) {
    const key = `${id}:${action}`;
    setBusyAction(key);
    try {
      await apiFetch<NeedRequestDetail>(`/warehouse/requests/${id}/${action}`, {
        method: "POST",
        body: action === "approve" ? undefined : JSON.stringify({ reason: actionReason || null }),
      });
      setPendingAction(null);
      setReason("");
      load(status);
      setToast(commonDict.actionSuccess);
    } catch (error) {
      setToast(error instanceof ApiError ? error.message : errorsDict.generic);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleExport() {
    const query = status ? `?status=${status}&size=10000` : "?size=10000";
    const all = await apiFetch<PagedResponse<NeedRequestListItem>>(`/warehouse/requests${query}`);
    await exportToXlsx(
      dict.title,
      dict.title,
      [
        { header: dict.columnRequester, value: (r: NeedRequestListItem) => r.requesterName },
        { header: dict.columnDepartment, value: (r: NeedRequestListItem) => r.department?.ar ?? "" },
        { header: dict.columnStatus, value: (r: NeedRequestListItem) => statusLabel(r.status) ?? r.status },
        { header: dict.columnSuggestedStart, value: (r: NeedRequestListItem) => r.suggestedStartDate ?? "" },
      ],
      all.content
    );
  }

  function handleAdded(request: NeedRequestDetail) {
    setShowAddModal(false);
    load(status);
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
          <div className="filter-row">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                load(e.target.value);
              }}
            >
              <option value="">{dict.statusFilterAll}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
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
          // Cards, not rows: the legacy screen leads with the status stamp
          // and puts the request's own details underneath, which a table
          // cannot carry without a column per fact.
          <div className="request-cards">
            {page.content.map((request) => (
              <article key={request.id} className="request-card">
                <header className="request-card-head">
                  <h3 className="request-card-title">
                    {dict.cardTitle} — {request.department ? request.department.ar : "—"}
                  </h3>
                  <span className={`stamp ${STATUS_STAMP_CLASS[request.status]}`}>
                    <span className="dot" />
                    {statusLabel(request.status)}
                  </span>
                </header>

                <div className="request-card-meta">
                  <span>{request.requesterName}</span>
                  {request.department && <span>{request.department.ar}</span>}
                  {request.suggestedStartDate && (
                    <span className="mono">{request.suggestedStartDate}</span>
                  )}
                </div>

                {(request.lines?.length ?? 0) > 0 && (
                  <div className="request-card-chips">
                    {(request.lines ?? []).map((line) => (
                      <span key={line.id} className="chip">
                        {line.itemNameAr} × {line.quantityRequested}
                      </span>
                    ))}
                  </div>
                )}

                {request.notes && <p className="request-card-notes">{request.notes}</p>}

                {request.suggestedStartDate && (
                  <p className="request-card-banner">
                    {dict.columnSuggestedStart}: <b>{request.suggestedStartDate}</b>
                  </p>
                )}

                <RequestCardActivity
                  actions={request.actions}
                  attachments={request.attachments}
                  actionLabel={actionLabel}
                  activityTitle={dict.activityTitle}
                  attachmentsDict={attachmentsDict}
                />

                <div className="request-card-actions">
                  {(request.status === "PENDING" || request.status === "POSTPONED") &&
                    permissions.includes("wh.act.approve") && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={busyAction !== null}
                        onClick={() => void act(request.id, "approve")}
                      >
                        {busyAction === `${request.id}:approve` && <span className="spinner" />}
                        {dict.approve}
                      </button>
                    )}
                  {(request.status === "PENDING" || request.status === "APPROVED" || request.status === "POSTPONED") &&
                    permissions.includes("wh.act.reject") && (
                      <button
                        type="button"
                        className="btn btn-seal btn-sm"
                        disabled={busyAction !== null}
                        onClick={() => setPendingAction({ id: request.id, action: "reject" })}
                      >
                        {dict.reject}
                      </button>
                    )}
                  {(request.status === "PENDING" || request.status === "APPROVED") &&
                    permissions.includes("wh.act.postpone") && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={busyAction !== null}
                        onClick={() => setPendingAction({ id: request.id, action: "postpone" })}
                      >
                        {dict.postpone}
                      </button>
                    )}
                  <Link className="btn btn-outline btn-sm" href={`/warehouse/requests/${request.id}`}>
                    {dict.cardOpen}
                  </Link>
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
              <NewRequestView
                dict={dict}
                commonDict={commonDict}
                errorsDict={errorsDict}
                onSubmitted={handleAdded}
                onSubmittingChange={setAddSubmitting}
                onCancel={() => setShowAddModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {pendingAction && (
        <RequestActionDialog
          title={pendingAction.action === "reject" ? dict.reject : dict.postpone}
          reasonLabel={dict.reasonLabel}
          cancelLabel={commonDict.cancel}
          submitting={busyAction !== null}
          reason={reason}
          onReasonChange={setReason}
          onConfirm={() => void act(pendingAction.id, pendingAction.action, reason)}
          onCancel={() => {
            setPendingAction(null);
            setReason("");
          }}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
