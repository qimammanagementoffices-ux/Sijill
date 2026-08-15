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
import NewAssetRequestView from "@/components/NewAssetRequestView";
import { requestErrorMessage } from "@/lib/requestErrorMessage";
import { usePermissions } from "@/lib/session";
import { useQueueCounts } from "@/lib/queueCounts";
import RequestDecisionDialog from "@/components/RequestDecisionDialog";
import RequestCardActivity, { formatActionDate } from "@/components/RequestCardActivity";
import Toast from "@/components/Toast";
import TableSearch from "@/components/TableSearch";
import SuggestedStartNotice from "@/components/SuggestedStartNotice";
import type {
  AssetRequestDetail,
  AssetRequestListItem,
  AssetRequestStatusValue,
  PagedResponse,
  RequestDecisionBody,
} from "@/lib/types";
import { withCount } from "@/lib/withCount";
import type { Dictionary } from "@/i18n/getDictionary";

const STATUS_STAMP_CLASS: Record<string, string> = {
  PENDING: "s-pending",
  APPROVED_UNDER_REVIEW: "s-review",
  REJECTED_UNDER_REVIEW: "s-review",
  APPROVED: "s-approved",
  POSTPONED: "s-postponed",
  REJECTED: "s-rejected",
  CLOSED: "s-closed",
};

// No reject-receipt here: fulfilling an asset request performs a custody
// transfer, which is its own audited record naming the receiving employee.
type DecisionKind =
  | "approve"
  | "reject"
  | "postpone"
  | "countersign"
  | "overturn-approve"
  | "overturn-reject"
  | "overturn-postpone";

const REQUIRES_REASON: DecisionKind[] = ["reject", "postpone", "overturn-reject", "overturn-postpone"];

type AssetRequestView = "pending" | "review" | "all" | "mine" | "archive";

export default function AssetRequestList({
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
  dict: Dictionary["assetRequests"];
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
  const [view, setView] = useState<AssetRequestView>("pending");
  const [q, setQ] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState<PagedResponse<AssetRequestListItem> | null>(null);
  const [filtering, setFiltering] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  // A refusal and a confirmation used to look identical -- same neutral pill.
  // The tone now travels with the message: setToast still takes a plain string
  // for successes, failures go through failToast and come out red.
  const [toast, setToastState] = useState<{ message: string; error: boolean } | null>(null);
  const setToast = (message: string) => setToastState({ message, error: false });
  const failToast = (error: unknown) =>
    setToastState({ message: requestErrorMessage(error, requestErrorsDict, errorsDict.generic), error: true });
  // From AppShell's /auth/me, not a second call of our own.
  const permissions = usePermissions();
  const { counts, refreshCounts } = useQueueCounts(
    "/asset-requests",
    permissions.includes("as.act.countersign")
  );
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [decision, setDecision] = useState<{ request: AssetRequestListItem; kind: DecisionKind } | null>(null);
  const [viewRequest, setViewRequest] = useState<AssetRequestListItem | null>(null);

  function queryFor(nextView: AssetRequestView, query: string) {
    const params = new URLSearchParams();
    if (nextView === "pending") params.set("status", "PENDING");
    if (nextView === "mine") params.set("mine", "true");
    // Both under-review states at once — a single status filter cannot say it.
    if (nextView === "review") params.set("underReview", "true");
    if (nextView === "archive") params.set("archived", "true");
    if (query) params.set("q", query);
    return `?${params.toString()}`;
  }

  function load(nextView = view, query = appliedQuery) {
    setFiltering(true);
    // Both queue badges, not just the tab being loaded -- a decision here
    // changes the size of the other queue too.
    refreshCounts();
    apiFetch<PagedResponse<AssetRequestListItem>>(`/asset-requests${queryFor(nextView, query)}`)
      .then(setPage)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.replace("/dashboard");
          return;
        }
        // Anything else used to be swallowed: the list never arrived and the
        // page sat on its loading state with nothing to explain it.
        failToast(err);
        setPage((current) => current ?? { content: [], page: 0, size: 0, totalElements: 0, totalPages: 0 });
      })
      .finally(() => setFiltering(false));
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load("pending", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (searchParams.get("new") === "1") setShowAddModal(true);
  }, [searchParams]);

  function statusLabel(s: string) {
    return statusDict[s as AssetRequestStatusValue] ?? s;
  }

  function purposeLabel(purpose: AssetRequestListItem["purpose"]) {
    return purpose === "PURCHASE"
      ? dict.purposePurchase
      : purpose === "MAINTENANCE"
        ? dict.purposeMaintenance
        : purpose === "TRANSFER"
          ? dict.purposeTransfer
          : dict.cardTitle;
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
        FINISH: dict.finish,
        ARCHIVE: actionsDict.archive,
        RESTORE: actionsDict.restore,
        RESURFACE: actionsDict.resurface,
      }[action] ?? action
    );
  }

  function decisionTitle(kind: DecisionKind, s: AssetRequestStatusValue) {
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
    }
  }

  function selectView(nextView: AssetRequestView) {
    setView(nextView);
    load(nextView);
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setAppliedQuery(q);
    load(view, q);
  }

  const DECISION_PATH: Record<DecisionKind, string> = {
    approve: "approve",
    reject: "reject",
    postpone: "postpone",
    countersign: "countersign",
    "overturn-approve": "overturn",
    "overturn-reject": "overturn",
    "overturn-postpone": "overturn",
  };

  async function post(id: string, path: string) {
    setBusyAction(`${id}:${path}`);
    try {
      await apiFetch(`/asset-requests/${id}/${path}`, { method: "POST" });
      load();
      setToast(commonDict.actionSuccess);
    } catch (error) {
      failToast(error);
    } finally {
      setBusyAction(null);
    }
  }

  async function act(id: string, kind: DecisionKind, body: RequestDecisionBody) {
    setBusyAction(`${id}:${kind}`);
    try {
      const outcome = kind.startsWith("overturn-") ? kind.slice("overturn-".length).toUpperCase() : null;
      await apiFetch(`/asset-requests/${id}/${DECISION_PATH[kind]}`, {
        method: "POST",
        body: JSON.stringify(outcome ? { ...body, outcome } : body),
      });
      setDecision(null);
      load();
      setToast(commonDict.actionSuccess);
    } catch (error) {
      failToast(error);
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
        <h1 className="section-title disp">{withCount(dict.title, page)}</h1>
      </div>
      <div className="print-only">
        <PrintReportHeader title={dict.title} dict={commonDict} />
      </div>

      <div className="panel request-directory-panel">
        <div className="panel-head table-toolbar no-print">
          <div className="request-toolbar">
            <div className="request-tabs">
              <button type="button" className={`btn btn-sm ${view === "pending" ? "btn-primary" : "btn-outline"}`} onClick={() => selectView("pending")}>{dict.pendingTab}{counts ? ` (${counts.pending})` : ""}</button>
              {permissions.includes("as.act.countersign") && (
                <button type="button" className={`btn btn-sm ${view === "review" ? "btn-primary" : "btn-outline"}`} onClick={() => selectView("review")}>{cardDict.reviewTab}{counts ? ` (${counts.underReview})` : ""}</button>
              )}
              <button type="button" className={`btn btn-sm ${view === "all" ? "btn-primary" : "btn-outline"}`} onClick={() => selectView("all")}>{dict.allTab}</button>
              <button type="button" className={`btn btn-sm ${view === "mine" ? "btn-primary" : "btn-outline"}`} onClick={() => selectView("mine")}>{dict.mineTab}</button>
              {permissions.includes("emp.manage") && (
                <button type="button" className={`btn btn-sm ${view === "archive" ? "btn-primary" : "btn-outline"}`} onClick={() => selectView("archive")}>{cardDict.archiveTab}</button>
              )}
            </div>
            <form className="filter-row" onSubmit={handleSearch}>
              <TableSearch value={q} onChange={setQ} placeholder={dict.searchPlaceholder} label={commonDict.search} />
            </form>
            <span className="request-filter-spinner-slot" aria-hidden="true">
              {filtering && <span className="spinner" />}
            </span>
          </div>
          <div className="table-toolbar-actions">
            <ExportButton format="xlsx" label={commonDict.exportXlsx} onClick={handleExport} />
            <ExportButton format="pdf" label={commonDict.exportPdf} onClick={() => window.print()} />
            {permissions.includes("as.request") && (
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
                  <h3 className="request-card-title">{purposeLabel(request.purpose)} — {request.assetNameAr}</h3>
                  <span className="request-card-state"><span className={`stamp ${STATUS_STAMP_CLASS[request.status]}`}><span className="dot" />{statusLabel(request.status)}</span>{request.status === "POSTPONED" && request.postponedUntil && <time>{request.postponedUntil}</time>}</span>
                </header>
                <div className="request-card-meta"><span>{request.requesterName}</span>{request.department && <span>{request.department.ar}</span>}{request.room && <span>{request.room.ar}</span>}{request.assetNumber !== "—" && <span className="chip chip-sm">{request.assetNumber}</span>}{request.priority && <span className="chip chip-sm">{request.priority === "URGENT" ? dict.priorityUrgent : dict.priorityNormal}</span>}{request.destinationRoom && <span>{dict.destinationRoomLabel}: <b>{request.destinationRoom.ar}</b></span>}</div>
                {request.reason && <p className="request-card-notes">{request.reason}</p>}
                {request.suggestedStartDate && <SuggestedStartNotice date={request.suggestedStartDate} template={dict.startWorkNotice} locale={locale} />}
                <RequestCardActivity actions={request.actions} attachments={request.attachments} actionLabel={actionLabel} activityTitle={dict.activityTitle}
                  systemActorLabel={cardDict.systemActor} attachmentsDict={attachmentsDict} />
                <div className="request-card-actions">
                  {request.status === "PENDING" && !request.archivedAt && (
                    <>
                      {permissions.includes("as.act.approve") && <button type="button" className="btn btn-sm request-decision request-decision-approve" disabled={busyAction !== null} onClick={() => setDecision({ request, kind: "approve" })}>{actionsDict.approve}</button>}
                      {permissions.includes("as.act.postpone") && <button type="button" className="btn btn-sm request-decision request-decision-postpone" disabled={busyAction !== null} onClick={() => setDecision({ request, kind: "postpone" })}>{actionsDict.postpone}</button>}
                      {permissions.includes("as.act.reject") && <button type="button" className="btn btn-sm request-decision request-decision-reject" disabled={busyAction !== null} onClick={() => setDecision({ request, kind: "reject" })}>{actionsDict.reject}</button>}
                    </>
                  )}
                  {(request.status === "APPROVED_UNDER_REVIEW" || request.status === "REJECTED_UNDER_REVIEW") && !request.archivedAt && permissions.includes("as.act.countersign") && (
                    <>
                      <button type="button" className="btn btn-sm request-decision request-decision-approve" disabled={busyAction !== null} onClick={() => setDecision({ request, kind: "countersign" })}>{request.status === "APPROVED_UNDER_REVIEW" ? actionsDict.confirmApproval : actionsDict.confirmRejection}</button>
                      <button type="button" className="btn btn-outline btn-sm" disabled={busyAction !== null} onClick={() => setDecision({ request, kind: request.status === "APPROVED_UNDER_REVIEW" ? "overturn-reject" : "overturn-approve" })}>{request.status === "APPROVED_UNDER_REVIEW" ? actionsDict.cancelApproval : actionsDict.cancelRejection}</button>
                      <button type="button" className="btn btn-sm request-decision request-decision-postpone" disabled={busyAction !== null} onClick={() => setDecision({ request, kind: "overturn-postpone" })}>{actionsDict.postpone}</button>
                    </>
                  )}
                  {request.status === "APPROVED" && !request.archivedAt && permissions.includes("as.act.finish") && (
                    <button type="button" className="btn btn-sm request-decision request-decision-approve" disabled={busyAction !== null} onClick={() => void post(request.id, "finish")}>
                      {busyAction === `${request.id}:finish` && <span className="spinner" />}
                      {dict.finish}
                    </button>
                  )}
                  {permissions.includes("emp.manage") && (
                    <button type="button" className="btn btn-outline btn-sm" disabled={busyAction !== null} onClick={() => void post(request.id, request.archivedAt ? "restore" : "archive")}>
                      {busyAction === `${request.id}:${request.archivedAt ? "restore" : "archive"}` && <span className="spinner" />}
                      {request.archivedAt ? actionsDict.restore : actionsDict.archive}
                    </button>
                  )}
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setViewRequest(request)}>{dict.cardOpen}</button>
                </div>
              </article>
            ))}
          </div>
        )}
        </div>
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

      {decision && (
        <RequestDecisionDialog
          key={`${decision.request.id}:${decision.kind}`}
          title={decisionTitle(decision.kind, decision.request.status)}
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
        <div className="overlay no-print" role="dialog" aria-modal="true" aria-labelledby="asset-request-view-title">
          <div className="modal wide request-view-modal">
            <div className="modal-head">
              <h3 id="asset-request-view-title">{purposeLabel(viewRequest.purpose)} — {viewRequest.assetNameAr}</h3>
              <button type="button" className="modal-close" onClick={() => setViewRequest(null)} aria-label="close">×</button>
            </div>
            <div className="modal-body request-form-modal-body">
              <div className="print-pages"><LegacyRequestForm
                title={["نموذج طلب أصل", "Asset Request Form", "संपत्ति अनुरोध फ़ॉर्म"]}
                subtitle={[viewRequest.assetNameAr, viewRequest.assetNameEn, "—"]}
                documentNumber={`AS-${viewRequest.id.replace(/-/g, "").slice(0, 5).toUpperCase()}`}
                status={statusLabel(viewRequest.status) ?? viewRequest.status}
                statusClass={STATUS_STAMP_CLASS[viewRequest.status] ?? "s-pending"}
                actions={viewRequest.actions}
                actionLabel={actionLabel}
                cells={[
                  { label: ["مقدّم الطلب", "Requested by", "अनुरोधकर्ता"], value: viewRequest.requesterName },
                  { label: ["المسمى الوظيفي", "Job Title", "पदनाम"], value: "—" },
                  { label: ["القسم / الإدارة", "Department", "विभाग"], value: viewRequest.department?.ar ?? "—" },
                  { label: ["نوع الطلب", "Request Purpose", "अनुरोध का उद्देश्य"], value: purposeLabel(viewRequest.purpose) },
                  { label: ["الغرفة", "Room", "कमरा"], value: viewRequest.room?.ar ?? "—" },
                  ...(viewRequest.destinationRoom ? [{ label: ["الغرفة الجديدة", "Destination Room", "गंतव्य कमरा"] as [string, string, string], value: viewRequest.destinationRoom.ar }] : []),
                  { label: ["الأصل المطلوب", "Requested Asset", "अनुरोधित संपत्ति"], value: viewRequest.assetNameAr },
                  { label: ["رقم الأصل", "Asset Number", "संपत्ति संख्या"], value: viewRequest.assetNumber },
                  { label: ["تاريخ التقديم", "Submission Date", "प्रस्तुत करने की तिथि"], value: viewRequest.actions.find((a) => a.action === "SUBMIT")?.createdAt?.slice(0, 10) ?? "—" },
                  { label: ["تاريخ بدء العمل المتوقع", "Expected Start Date", "अपेक्षित प्रारंभ तिथि"], value: viewRequest.suggestedStartDate ?? "—" },
                ]}
                sectionTitle={["وصف الحاجة", "Need Description", "आवश्यकता विवरण"]}
              ><div className="legacy-form-notes">{viewRequest.reason || "—"}</div></LegacyRequestForm></div>
            </div>
            <div className="modal-foot"><button type="button" className="btn btn-outline btn-sm" onClick={() => setViewRequest(null)}>{commonDict.cancel}</button><button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>{commonDict.print}</button></div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} error={toast.error} durationMs={toast.error ? 6000 : 3000} onDismiss={() => setToastState(null)} />}
    </>
  );
}
