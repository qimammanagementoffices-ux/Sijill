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
import { requestErrorMessage } from "@/lib/requestErrorMessage";
import { useSession } from "@/lib/session";
import RequestDecisionDialog from "@/components/RequestDecisionDialog";
import RequestCardActivity, { formatActionDate } from "@/components/RequestCardActivity";
import Toast from "@/components/Toast";
import TableSearch from "@/components/TableSearch";
import SuggestedStartNotice from "@/components/SuggestedStartNotice";
import type {
  MaintenanceRequestDetail,
  MaintenanceRequestListItem,
  MaintenanceRequestStatusValue,
  PagedResponse,
  RequestDecisionBody,
} from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

const STATUS_STAMP_CLASS: Record<string, string> = {
  PENDING: "s-pending",
  APPROVED_UNDER_REVIEW: "s-review",
  REJECTED_UNDER_REVIEW: "s-review",
  APPROVED: "s-approved",
  POSTPONED: "s-postponed",
  REJECTED: "s-rejected",
  IN_PROGRESS: "s-progress",
  DONE: "s-done",
  CLOSED: "s-closed",
};

type DecisionKind =
  | "approve"
  | "reject"
  | "postpone"
  | "countersign"
  | "overturn-approve"
  | "overturn-reject"
  | "overturn-postpone"
  | "reject-receipt";

const REQUIRES_REASON: DecisionKind[] = [
  "reject",
  "postpone",
  "overturn-reject",
  "overturn-postpone",
  "reject-receipt",
];

export default function MaintenanceRequestList({
  dict,
  errorsDict,
  commonDict,
  attachmentsDict,
  statusDict,
  actionsDict,
  modalsDict,
  cardDict,
  requestErrorsDict,
  locale,
}: {
  dict: Dictionary["maintenanceRequests"];
  errorsDict: Dictionary["errors"];
  commonDict: Dictionary["common"];
  attachmentsDict: Dictionary["attachments"];
  requestErrorsDict: Dictionary["requestErrors"];
  statusDict: Dictionary["requestStatus"];
  actionsDict: Dictionary["requestActions"];
  modalsDict: Dictionary["requestModals"];
  cardDict: Dictionary["requestCard"];
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
  // From AppShell's /auth/me, not a second call of our own.
  const { id: currentEmployeeId, permissions } = useSession();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [decision, setDecision] = useState<{ request: MaintenanceRequestListItem; kind: DecisionKind } | null>(null);
  const [viewRequest, setViewRequest] = useState<MaintenanceRequestListItem | null>(null);
  const [archived, setArchived] = useState(false);

  function load(statusFilter = status, query = appliedQuery, mineOnly = mine, showArchived = archived) {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (query) params.set("q", query);
    if (mineOnly) params.set("mine", "true");
    if (showArchived) params.set("archived", "true");
    // Sentinel for the counter-signer's queue: both under-review states.
    if (statusFilter === "UNDER_REVIEW") {
      params.delete("status");
      params.set("underReview", "true");
    }
    setFiltering(true);
    apiFetch<PagedResponse<MaintenanceRequestListItem>>(`/maintenance/requests?${params.toString()}`)
      .then(setPage)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.replace("/dashboard");
          return;
        }
        // Anything else used to be swallowed: the list never arrived and the
        // page sat on its loading state with nothing to explain it.
        setToast(requestErrorMessage(err, requestErrorsDict, errorsDict.generic));
        setPage((current) => current ?? { content: [], page: 0, size: 0, totalElements: 0, totalPages: 0 });
      })
      .finally(() => setFiltering(false));
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load("PENDING", "", false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (searchParams.get("new") === "1" && permissions.includes("mt.request")) setShowAddModal(true);
  }, [searchParams, permissions]);

  function statusLabel(s: string) {
    return statusDict[s as MaintenanceRequestStatusValue] ?? s;
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
    return (
      {
        SUBMIT: dict.submit,
        APPROVE: actionsDict.approve,
        REJECT: actionsDict.reject,
        POSTPONE: actionsDict.postpone,
        COUNTERSIGN_APPROVE: actionsDict.confirmApproval,
        COUNTERSIGN_REJECT: actionsDict.confirmRejection,
        OVERTURN_APPROVE: actionsDict.cancelRejection,
        OVERTURN_REJECT: actionsDict.cancelApproval,
        OVERTURN_POSTPONE: actionsDict.postpone,
        START: actionsDict.startWork,
        FINISH: actionsDict.finishWork,
        RECEIVE: actionsDict.confirmReceipt,
        REJECT_RECEIPT: actionsDict.rejectReceipt,
        ARCHIVE: actionsDict.archive,
        RESTORE: actionsDict.restore,
      }[action] ?? action
    );
  }

  function decisionTitle(kind: DecisionKind, s: MaintenanceRequestStatusValue) {
    switch (kind) {
      case "approve":
        return modalsDict.approveTitle;
      case "reject":
        return modalsDict.rejectTitle;
      case "postpone":
      case "overturn-postpone":
        return modalsDict.postponeTitle;
      case "countersign":
        return s === "APPROVED_UNDER_REVIEW" ? modalsDict.confirmApprovalTitle : modalsDict.confirmRejectionTitle;
      case "overturn-reject":
        return modalsDict.cancelApprovalTitle;
      case "overturn-approve":
        return modalsDict.cancelRejectionTitle;
      case "reject-receipt":
        return modalsDict.rejectReceiptTitle;
    }
  }

  function selectView(nextStatus: string, mineOnly: boolean, showArchived = false) {
    setStatus(nextStatus);
    setMine(mineOnly);
    setArchived(showArchived);
    load(nextStatus, appliedQuery, mineOnly, showArchived);
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setAppliedQuery(q);
    load(status, q, mine);
  }

  const DECISION_PATH: Record<DecisionKind, string> = {
    approve: "approve",
    reject: "reject",
    postpone: "postpone",
    countersign: "countersign",
    "overturn-approve": "overturn",
    "overturn-reject": "overturn",
    "overturn-postpone": "overturn",
    "reject-receipt": "reject-receipt",
  };

  async function act(id: string, kind: DecisionKind, body: RequestDecisionBody) {
    const key = `${id}:${kind}`;
    setBusyAction(key);
    try {
      const outcome = kind.startsWith("overturn-") ? kind.slice("overturn-".length).toUpperCase() : null;
      await apiFetch<MaintenanceRequestDetail>(`/maintenance/requests/${id}/${DECISION_PATH[kind]}`, {
        method: "POST",
        body: JSON.stringify(outcome ? { ...body, outcome } : body),
      });
      setDecision(null);
      load();
      setToast(commonDict.actionSuccess);
    } catch (error) {
      setToast(requestErrorMessage(error, requestErrorsDict, errorsDict.generic));
    } finally {
      setBusyAction(null);
    }
  }

  // Simple actions: start, finish, receive, archive, restore.
  async function post(id: string, path: string, body?: unknown) {
    const key = `${id}:${path}`;
    setBusyAction(key);
    try {
      await apiFetch<MaintenanceRequestDetail>(`/maintenance/requests/${id}/${path}`, {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      load();
      setToast(commonDict.actionSuccess);
    } catch (error) {
      setToast(requestErrorMessage(error, requestErrorsDict, errorsDict.generic));
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
              <button type="button" className={`btn btn-sm ${status === "PENDING" && !mine && !archived ? "btn-primary" : "btn-outline"}`} onClick={() => selectView("PENDING", false)}>{cardDict.pendingTab}{status === "PENDING" && !mine && !archived && page ? ` (${page.totalElements})` : ""}</button>
              {permissions.includes("mt.act.countersign") && (
                <button type="button" className={`btn btn-sm ${status === "UNDER_REVIEW" ? "btn-primary" : "btn-outline"}`} onClick={() => selectView("UNDER_REVIEW", false)}>{cardDict.reviewTab}</button>
              )}
              <button type="button" className={`btn btn-sm ${status === "" && !mine && !archived ? "btn-primary" : "btn-outline"}`} onClick={() => selectView("", false)}>{dict.allTab}</button>
              <button type="button" className={`btn btn-sm ${mine ? "btn-primary" : "btn-outline"}`} onClick={() => selectView("", true)}>{dict.mineTab}</button>
              {permissions.includes("emp.manage") && (
                <button type="button" className={`btn btn-sm ${archived ? "btn-primary" : "btn-outline"}`} onClick={() => selectView("", false, true)}>{cardDict.archiveTab}</button>
              )}
            </div>
            <form className="filter-row" onSubmit={handleSearch}>
              <TableSearch value={q} onChange={setQ} placeholder={dict.searchPlaceholder} label={commonDict.search} />
            </form>
            {/* Fixed-width slot: a spinner that comes and goes inside the flex
                row shifts the search box sideways on every refetch. */}
            <span className="request-filter-spinner-slot" aria-hidden="true">
              {filtering && <span className="spinner" />}
            </span>
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

        {/* Veil over the cards rather than a spinner on the tab that was
            clicked, so a refetch reads as "the whole list is being replaced". */}
        <div className="table-loading-wrap">
        {filtering && (
          <div className="table-loading-veil">
            <span className="spinner" />
          </div>
        )}
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
                  <span className="request-card-state"><span className={`stamp ${STATUS_STAMP_CLASS[request.status]}`}><span className="dot" />{statusLabel(request.status)}</span>{request.status === "POSTPONED" && request.postponedUntil && <time>{request.postponedUntil}</time>}</span>
                </header>

                <div className="request-card-meta">
                  <span>{request.requesterName}</span>
                  {request.department && <span>{request.department.ar}</span>}
                  {request.location && <span>{request.location}</span>}
                  <span className="chip chip-sm">{priorityLabel(request.priority)}</span>
                </div>

                {request.description && <p className="request-card-notes">{request.description}</p>}

                {request.status === "POSTPONED" && request.postponedUntil && (
                  <p className="request-card-notice">
                    {cardDict.postponeResurfaceNote.replace("{date}", request.postponedUntil)}
                  </p>
                )}
                {request.returnedBySenior && <p className="request-card-notice">{cardDict.returnedBySenior}</p>}
                {request.archivedAt && <p className="request-card-notice">{cardDict.archivedNote}</p>}

                {request.suggestedStartDate && request.status !== "POSTPONED" && (
                  <SuggestedStartNotice date={request.suggestedStartDate} template={dict.startWorkNotice} locale={locale} />
                )}

                <RequestCardActivity
                  actions={request.actions}
                  attachments={request.attachments}
                  actionLabel={actionLabel}
                  activityTitle={dict.activityTitle}
                  systemActorLabel={cardDict.systemActor}
                  attachmentsDict={attachmentsDict}
                />

                <div className="request-card-actions">
                  {request.status === "PENDING" && !request.archivedAt && (
                    <>
                      {permissions.includes("mt.act.approve") && (
                        <button type="button" className="btn btn-sm request-decision request-decision-approve" disabled={busyAction !== null} onClick={() => setDecision({ request, kind: "approve" })}>
                          {actionsDict.approve}
                        </button>
                      )}
                      {permissions.includes("mt.act.postpone") && (
                        <button type="button" className="btn btn-sm request-decision request-decision-postpone" disabled={busyAction !== null} onClick={() => setDecision({ request, kind: "postpone" })}>
                          {actionsDict.postpone}
                        </button>
                      )}
                      {permissions.includes("mt.act.reject") && (
                        <button type="button" className="btn btn-sm request-decision request-decision-reject" disabled={busyAction !== null} onClick={() => setDecision({ request, kind: "reject" })}>
                          {actionsDict.reject}
                        </button>
                      )}
                    </>
                  )}

                  {(request.status === "APPROVED_UNDER_REVIEW" || request.status === "REJECTED_UNDER_REVIEW") &&
                    !request.archivedAt &&
                    permissions.includes("mt.act.countersign") && (
                      <>
                        <button type="button" className="btn btn-sm request-decision request-decision-approve" disabled={busyAction !== null} onClick={() => setDecision({ request, kind: "countersign" })}>
                          {request.status === "APPROVED_UNDER_REVIEW" ? actionsDict.confirmApproval : actionsDict.confirmRejection}
                        </button>
                        <button type="button" className="btn btn-outline btn-sm" disabled={busyAction !== null} onClick={() => setDecision({ request, kind: request.status === "APPROVED_UNDER_REVIEW" ? "overturn-reject" : "overturn-approve" })}>
                          {request.status === "APPROVED_UNDER_REVIEW" ? actionsDict.cancelApproval : actionsDict.cancelRejection}
                        </button>
                        <button type="button" className="btn btn-sm request-decision request-decision-postpone" disabled={busyAction !== null} onClick={() => setDecision({ request, kind: "overturn-postpone" })}>
                          {actionsDict.postpone}
                        </button>
                      </>
                    )}

                  {/* Maintenance starts work rather than delivering: after
                      final approval the card offers بدأ التنفيذ, and إنهاء
                      العمل only once work is under way. */}
                  {request.status === "APPROVED" && !request.archivedAt && permissions.includes("mt.act.start") && (
                    <button type="button" className="btn btn-primary btn-sm" disabled={busyAction !== null} onClick={() => void post(request.id, "start")}>
                      {busyAction === `${request.id}:start` && <span className="spinner" />}
                      {actionsDict.startWork}
                    </button>
                  )}

                  {/* Finishing records which parts were consumed, so it opens
                      the request page rather than posting an empty report. */}
                  {request.status === "IN_PROGRESS" && !request.archivedAt && permissions.includes("mt.act.finish") && (
                    <a className="btn btn-sm request-decision request-decision-approve" href={`/maintenance/requests/${request.id}`}>
                      {actionsDict.finishWork}
                    </a>
                  )}

                  {request.status === "DONE" && !request.archivedAt && request.requesterId === currentEmployeeId && (
                    <>
                      <button type="button" className="btn btn-sm request-decision request-decision-approve" disabled={busyAction !== null} onClick={() => void post(request.id, "receive")}>
                        {busyAction === `${request.id}:receive` && <span className="spinner" />}
                        {actionsDict.confirmReceipt}
                      </button>
                      <button type="button" className="btn btn-sm request-decision request-decision-reject" disabled={busyAction !== null} onClick={() => setDecision({ request, kind: "reject-receipt" })}>
                        {actionsDict.rejectReceipt}
                      </button>
                    </>
                  )}

                  {permissions.includes("emp.manage") && (
                    <button type="button" className="btn btn-outline btn-sm" disabled={busyAction !== null} onClick={() => void post(request.id, request.archivedAt ? "restore" : "archive")}>
                      {busyAction === `${request.id}:${request.archivedAt ? "restore" : "archive"}` && <span className="spinner" />}
                      {request.archivedAt ? actionsDict.restore : actionsDict.archive}
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

      {decision && (
        <RequestDecisionDialog
          key={`${decision.request.id}:${decision.kind}`}
          title={decisionTitle(decision.kind, decision.request.status)}
          description={decision.kind === "reject-receipt" ? modalsDict.rejectReceiptDesc : undefined}
          requireComment={REQUIRES_REASON.includes(decision.kind)}
          needsDate={decision.kind === "postpone" || decision.kind === "overturn-postpone"}
          submitting={busyAction !== null}
          dict={modalsDict}
          commonDict={commonDict}
          onConfirm={(body) => void act(decision.request.id, decision.kind, body)}
          onCancel={() => setDecision(null)}
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
