"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import { exportToXlsx } from "@/lib/exportXlsx";
import PrintReportHeader from "@/components/PrintReportHeader";
import LegacyRequestForm from "@/components/LegacyRequestForm";
import SectionLoading from "@/components/SectionLoading";
import ExportButton from "@/components/ExportButton";
import NewMaintenanceRequestView from "@/components/NewMaintenanceRequestView";
import RequestActionDialog from "@/components/RequestActionDialog";
import RequestCardActivity, { formatActionDate, latestPostponeDate } from "@/components/RequestCardActivity";
import Toast from "@/components/Toast";
import TableSearch from "@/components/TableSearch";
import SuggestedStartNotice from "@/components/SuggestedStartNotice";
import type { MaintenanceRequestDetail, MaintenanceRequestListItem, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

const STATUS_STAMP_CLASS: Record<string, string> = {
  PENDING: "s-pending",
  APPROVED: "s-approved",
  POSTPONED: "s-postponed",
  REJECTED: "s-rejected",
  IN_PROGRESS: "s-progress",
  CLOSED: "s-closed",
};

export default function MaintenanceRequestList({
  dict,
  errorsDict,
  commonDict,
  attachmentsDict,
  locale,
}: {
  dict: Dictionary["maintenanceRequests"];
  errorsDict: Dictionary["errors"];
  commonDict: Dictionary["common"];
  attachmentsDict: Dictionary["attachments"];
  locale: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("PENDING");
  const [mine, setMine] = useState(false);
  const [q, setQ] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState<PagedResponse<MaintenanceRequestListItem> | null>(null);
  const [filtering, setFiltering] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ id: string; action: "reject" | "postpone" } | null>(null);
  const [viewRequest, setViewRequest] = useState<MaintenanceRequestListItem | null>(null);
  const [reason, setReason] = useState("");

  function load(statusFilter = status, query = appliedQuery, mineOnly = mine) {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (query) params.set("q", query);
    if (mineOnly) params.set("mine", "true");
    setFiltering(true);
    apiFetch<PagedResponse<MaintenanceRequestListItem>>(`/maintenance/requests?${params.toString()}`)
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
    load("PENDING", "", false);
    apiFetch<{ permissions: string[] }>("/auth/me")
      .then((me) => setPermissions(me.permissions))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (searchParams.get("new") === "1" && permissions.includes("mt.request")) setShowAddModal(true);
  }, [searchParams, permissions]);

  function statusLabel(s: string) {
    return {
      PENDING: dict.statusPending,
      APPROVED: dict.statusApproved,
      POSTPONED: dict.statusPostponed,
      REJECTED: dict.statusRejected,
      IN_PROGRESS: dict.statusInProgress,
      CLOSED: dict.statusClosed,
    }[s];
  }

  function priorityLabel(p: string) {
    return {
      LOW: dict.priorityLow,
      MEDIUM: dict.priorityMedium,
      HIGH: dict.priorityHigh,
      URGENT: dict.priorityUrgent,
    }[p];
  }

  function actionLabel(action: string) {
    return {
      SUBMIT: dict.submit,
      APPROVE: dict.approve,
      REJECT: dict.reject,
      POSTPONE: dict.postpone,
      START: dict.start,
      FINISH: dict.finish,
    }[action] ?? action;
  }

  function selectView(nextStatus: string, mineOnly: boolean) {
    setStatus(nextStatus);
    setMine(mineOnly);
    load(nextStatus, appliedQuery, mineOnly);
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setAppliedQuery(q);
    load(status, q, mine);
  }

  async function act(id: string, action: "approve" | "reject" | "postpone" | "start", actionReason?: string) {
    const key = `${id}:${action}`;
    setBusyAction(key);
    try {
      await apiFetch<MaintenanceRequestDetail>(`/maintenance/requests/${id}/${action}`, {
        method: "POST",
        body:
          action === "approve" || action === "start"
            ? undefined
            : JSON.stringify({ reason: actionReason || null }),
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
    const params = new URLSearchParams({ size: "10000" });
    if (status) params.set("status", status);
    if (appliedQuery) params.set("q", appliedQuery);
    if (mine) params.set("mine", "true");
    const all = await apiFetch<PagedResponse<MaintenanceRequestListItem>>(`/maintenance/requests?${params.toString()}`);
    await exportToXlsx(
      dict.title,
      dict.title,
      [
        { header: dict.columnRequester, value: (r: MaintenanceRequestListItem) => r.requesterName },
        { header: dict.columnFaultType, value: (r: MaintenanceRequestListItem) => r.faultType?.ar ?? "" },
        { header: dict.columnPriority, value: (r: MaintenanceRequestListItem) => priorityLabel(r.priority) ?? r.priority },
        { header: dict.columnStatus, value: (r: MaintenanceRequestListItem) => statusLabel(r.status) ?? r.status },
        { header: dict.columnSuggestedStart, value: (r: MaintenanceRequestListItem) => r.suggestedStartDate ?? "" },
      ],
      all.content
    );
  }

  function handleAdded(request: MaintenanceRequestDetail) {
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

      <div className="panel request-directory-panel">
        <div className="panel-head table-toolbar no-print">
          <div className="request-toolbar">
            <div className="request-tabs">
              <button type="button" className={`btn btn-sm ${status === "PENDING" && !mine ? "btn-primary" : "btn-outline"}`} onClick={() => selectView("PENDING", false)}>{dict.pendingTab}</button>
              <button type="button" className={`btn btn-sm ${status === "" && !mine ? "btn-primary" : "btn-outline"}`} onClick={() => selectView("", false)}>{dict.allTab}</button>
              <button type="button" className={`btn btn-sm ${mine ? "btn-primary" : "btn-outline"}`} onClick={() => selectView("", true)}>{dict.mineTab}</button>
            </div>
            <form className="filter-row" onSubmit={handleSearch}>
              <TableSearch value={q} onChange={setQ} placeholder={dict.searchPlaceholder} label={commonDict.search} />
            </form>
            {filtering && <span className="spinner" />}
          </div>
          <div className="table-toolbar-actions">
            <ExportButton format="xlsx" label={commonDict.exportXlsx} onClick={handleExport} />
            <ExportButton format="pdf" label={commonDict.exportPdf} onClick={() => window.print()} />
            {permissions.includes("mt.request") && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                {dict.addNew}
              </button>
            )}
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
                  <h3 className="request-card-title">
                    {dict.cardTitle} — {request.faultType ? request.faultType.ar : "—"}
                  </h3>
                  <span className="request-card-state"><span className={`stamp ${STATUS_STAMP_CLASS[request.status]}`}><span className="dot" />{statusLabel(request.status)}</span>{request.status === "POSTPONED" && latestPostponeDate(request.actions) && <time>{formatActionDate(latestPostponeDate(request.actions)!)}</time>}</span>
                </header>

                <div className="request-card-meta">
                  <span>{request.requesterName}</span>
                  {request.department && <span>{request.department.ar}</span>}
                  {request.location && <span>{request.location}</span>}
                  <span className="chip chip-sm">{priorityLabel(request.priority)}</span>
                </div>

                {request.description && <p className="request-card-notes">{request.description}</p>}

                {request.suggestedStartDate && <SuggestedStartNotice date={request.suggestedStartDate} template={dict.startWorkNotice} locale={locale} />}

                <RequestCardActivity
                  actions={request.actions}
                  attachments={request.attachments}
                  actionLabel={actionLabel}
                  activityTitle={dict.activityTitle}
                  attachmentsDict={attachmentsDict}
                />

                <div className="request-card-actions">
                  {(request.status === "PENDING" || request.status === "POSTPONED") &&
                    permissions.includes("mt.act.approve") && (
                      <button
                        type="button"
                        className="btn btn-sm request-decision request-decision-approve"
                        disabled={busyAction !== null}
                        onClick={() => void act(request.id, "approve")}
                      >
                        {busyAction === `${request.id}:approve` && <span className="spinner" />}
                        {dict.approve}
                      </button>
                    )}
                  {(request.status === "PENDING" || request.status === "APPROVED" || request.status === "POSTPONED") &&
                    permissions.includes("mt.act.reject") && (
                      <button
                        type="button"
                        className="btn btn-sm request-decision request-decision-reject"
                        disabled={busyAction !== null}
                        onClick={() => setPendingAction({ id: request.id, action: "reject" })}
                      >
                        {dict.reject}
                      </button>
                    )}
                  {(request.status === "PENDING" || request.status === "APPROVED") &&
                    permissions.includes("mt.act.postpone") && (
                      <button
                        type="button"
                        className="btn btn-sm request-decision request-decision-postpone"
                        disabled={busyAction !== null}
                        onClick={() => setPendingAction({ id: request.id, action: "postpone" })}
                      >
                        {dict.postpone}
                      </button>
                    )}
                  {request.status === "APPROVED" && permissions.includes("mt.act.start") && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busyAction !== null}
                      onClick={() => void act(request.id, "start")}
                    >
                      {busyAction === `${request.id}:start` && <span className="spinner" />}
                      {dict.start}
                    </button>
                  )}
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setViewRequest(request)}>
                    {dict.cardOpen}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="overlay maintenance-request-overlay" role="dialog" aria-modal="true">
          <div className="modal wide maintenance-request-modal">
            <div className="modal-head">
              <h3>{dict.addNew}</h3>
              <button type="button" className="modal-close" onClick={() => setShowAddModal(false)} aria-label="close">
                ×
              </button>
            </div>
            <div className="modal-body">
              <NewMaintenanceRequestView
                dict={dict}
                attachmentsDict={attachmentsDict}
                errorsDict={errorsDict}
                onSubmitted={handleAdded}
                formId="mt-request-add-form"
                onSubmittingChange={setAddSubmitting}
              />
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAddModal(false)} disabled={addSubmitting}>
                {commonDict.cancel}
              </button>
              <button type="submit" form="mt-request-add-form" className="btn btn-seal btn-sm" disabled={addSubmitting}>
                {addSubmitting && <span className="spinner" />}
                {dict.submit}
                {!addSubmitting && <span aria-hidden="true">✓</span>}
              </button>
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

      {viewRequest && (
        <div className="overlay no-print" role="dialog" aria-modal="true" aria-labelledby="maintenance-request-view-title">
          <div className="modal wide request-view-modal">
            <div className="modal-head">
              <h3 id="maintenance-request-view-title">{dict.cardTitle} — {viewRequest.faultType?.ar ?? "—"}</h3>
              <button type="button" className="modal-close" onClick={() => setViewRequest(null)} aria-label="close">×</button>
            </div>
            <div className="modal-body request-form-modal-body">
              <div className="print-pages"><LegacyRequestForm
                title={["نموذج بلاغ صيانة", "Maintenance Ticket Form", "रखरखाव शिकायत फ़ॉर्म"]}
                subtitle={[viewRequest.faultType?.ar ?? "—", viewRequest.faultType?.en ?? "—", "—"]}
                documentNumber={`MT-${viewRequest.id.replace(/-/g, "").slice(0, 5).toUpperCase()}`}
                status={statusLabel(viewRequest.status) ?? viewRequest.status}
                statusClass={STATUS_STAMP_CLASS[viewRequest.status] ?? "s-pending"}
                actions={viewRequest.actions}
                cells={[
                  { label: ["مقدّم الطلب", "Requested by", "अनुरोधकर्ता"], value: viewRequest.requesterName },
                  { label: ["المسمى الوظيفي", "Job Title", "पदनाम"], value: "—" },
                  { label: ["القسم / الإدارة", "Department", "विभाग"], value: viewRequest.department?.ar ?? "—" },
                  { label: ["نوع العطل", "Fault Type", "खराबी का प्रकार"], value: viewRequest.faultType?.ar ?? "—" },
                  { label: ["الموقع", "Location", "स्थान"], value: viewRequest.location ?? "—" },
                  { label: ["الأولوية", "Priority", "प्राथमिकता"], value: priorityLabel(viewRequest.priority) },
                  { label: ["تاريخ التقديم", "Submission Date", "प्रस्तुत करने की तिथि"], value: viewRequest.actions.find((a) => a.action === "SUBMIT")?.createdAt?.slice(0, 10) ?? "—" },
                  { label: ["تاريخ بدء العمل المتوقع", "Expected Start Date", "अपेक्षित प्रारंभ तिथि"], value: viewRequest.suggestedStartDate ?? "—" },
                ]}
                sectionTitle={["وصف العطل", "Fault Description", "खराबी का विवरण"]}
              ><div className="legacy-form-notes">{viewRequest.description || "—"}</div></LegacyRequestForm></div>
            </div>
            <div className="modal-foot"><button type="button" className="btn btn-outline btn-sm" onClick={() => setViewRequest(null)}>{commonDict.cancel}</button><button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>{commonDict.print}</button></div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
