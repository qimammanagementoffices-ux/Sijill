"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, apiUpload, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import { exportToXlsx } from "@/lib/exportXlsx";
import PrintReportHeader from "@/components/PrintReportHeader";
import LegacyRequestForm from "@/components/LegacyRequestForm";
import SectionLoading from "@/components/SectionLoading";
import ExportButton from "@/components/ExportButton";
import NewRequestView from "@/components/NewRequestView";
import { requestErrorMessage } from "@/lib/requestErrorMessage";
import { useSession } from "@/lib/session";
import { useQueueCounts } from "@/lib/queueCounts";
import { useReviewPolicy } from "@/lib/useReviewPolicy";
import RequestDecisionDialog from "@/components/RequestDecisionDialog";
import RequestDeliveryDialog from "@/components/RequestDeliveryDialog";
import RequestCardActivity from "@/components/RequestCardActivity";
import Toast from "@/components/Toast";
import TableSearch from "@/components/TableSearch";
import SuggestedStartNotice from "@/components/SuggestedStartNotice";
import type {
  NeedRequestDetail,
  NeedRequestListItem,
  NeedRequestStatusValue,
  PagedResponse,
  RequestActionLineEdit,
  RequestDecisionBody,
} from "@/lib/types";
import { withCount } from "@/lib/withCount";
import { formatEditDeadline } from "@/lib/formatEditDeadline";
import type { Dictionary } from "@/i18n/getDictionary";

function formatCardDate(value: string | undefined, locale: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : locale === "hi" ? "hi-IN" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Riyadh",
  }).format(date);
}

const STATUS_STAMP_CLASS: Record<string, string> = {
  PENDING: "s-pending",
  APPROVED_UNDER_REVIEW: "s-review",
  REJECTED_UNDER_REVIEW: "s-review",
  APPROVED: "s-approved",
  POSTPONED: "s-postponed",
  REJECTED: "s-rejected",
  DELIVERED: "s-delivered",
  CLOSED: "s-closed",
};

// Which decision each button sends, and what the dialog needs from the user.
type DecisionKind =
  | "approve"
  | "reject"
  | "postpone"
  | "countersign"
  | "overturn-approve"
  | "overturn-reject"
  | "overturn-postpone"
  | "reject-receipt";

// A refusal or a deferral always has to say why; an approval need not.
const REQUIRES_REASON: DecisionKind[] = [
  "reject",
  "postpone",
  "overturn-reject",
  "overturn-postpone",
  "reject-receipt",
];

// Only decisions that grant the items may trim or drop lines.
const GRANTS_ITEMS: DecisionKind[] = ["approve", "countersign", "overturn-approve"];

export default function RequestList({
  dict,
  errorsDict,
  commonDict,
  attachmentsDict,
  statusDict,
  actionsDict,
  modalsDict,
  cardDict,
  deliveryDict,
  requestErrorsDict,
  locale,
}: {
  dict: Dictionary["warehouseRequests"];
  errorsDict: Dictionary["errors"];
  commonDict: Dictionary["common"];
  attachmentsDict: Dictionary["attachments"];
  requestErrorsDict: Dictionary["requestErrors"];
  statusDict: Dictionary["requestStatus"];
  actionsDict: Dictionary["requestActions"];
  modalsDict: Dictionary["requestModals"];
  cardDict: Dictionary["requestCard"];
  deliveryDict: Dictionary["requestDelivery"];
  locale: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("PENDING");
  const [mine, setMine] = useState(false);
  const [q, setQ] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState<PagedResponse<NeedRequestListItem> | null>(null);
  const [filtering, setFiltering] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [, setAddSubmitting] = useState(false);
  // A refusal and a confirmation used to look identical -- same neutral pill.
  // The tone now travels with the message: setToast still takes a plain string
  // for successes, failures go through failToast and come out red.
  const [toast, setToastState] = useState<{ message: string; error: boolean } | null>(null);
  const setToast = (message: string) => setToastState({ message, error: false });
  const failToast = (error: unknown) =>
    setToastState({ message: requestErrorMessage(error, requestErrorsDict, errorsDict.generic), error: true });
  // From AppShell's /auth/me, not a second call of our own.
  const { id: currentEmployeeId, permissions } = useSession();
  const { counts, refreshCounts } = useQueueCounts(
    "/warehouse/requests",
    permissions.includes("wh.act.countersign")
  );
  const reviewPolicy = useReviewPolicy();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [decision, setDecision] = useState<{ request: NeedRequestListItem; kind: DecisionKind } | null>(null);
  const [delivering, setDelivering] = useState<NeedRequestListItem | null>(null);
  const [viewRequest, setViewRequest] = useState<NeedRequestListItem | null>(null);
  const [editRequest, setEditRequest] = useState<NeedRequestListItem | null>(null);
  const [archived, setArchived] = useState(false);

  function load(statusFilter = status, query = appliedQuery, mineOnly = mine, showArchived = archived) {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (query) params.set("q", query);
    if (mineOnly) params.set("mine", "true");
    if (showArchived) params.set("archived", "true");
    // Sentinel for the counter-signer's queue: both under-review states, which
    // a single status filter cannot express.
    if (statusFilter === "UNDER_REVIEW") {
      params.delete("status");
      params.set("underReview", "true");
    }
    setFiltering(true);
    // Both queue badges, not just the tab being loaded -- a decision here
    // changes the size of the other queue too.
    refreshCounts();
    apiFetch<PagedResponse<NeedRequestListItem>>(`/warehouse/requests?${params.toString()}`)
      .then(setPage)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.replace("/dashboard");
          return;
        }
        // Anything else used to be swallowed: the list simply never arrived and
        // the page sat on its loading state with nothing to explain it.
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
    load("PENDING", "", false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (searchParams.get("new") === "1" && permissions.includes("wh.request")) setShowAddModal(true);
    // Arriving from the dashboard's counter-signing queue: open that tab
    // rather than the default pending one, or the count just clicked would
    // appear to lead nowhere.
    if (searchParams.get("tab") === "review" && permissions.includes("wh.act.countersign")) {
      selectView("UNDER_REVIEW", false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, permissions]);

  function statusLabel(s: string) {
    return statusDict[s as NeedRequestStatusValue] ?? s;
  }

  function actionLabel(action: string) {
    return (
      {
        SUBMIT: dict.submit,
        EDIT: actionsDict.edit,
        APPROVE: actionsDict.approve,
        REJECT: actionsDict.reject,
        POSTPONE: actionsDict.postpone,
        COUNTERSIGN_APPROVE: actionsDict.confirmApproval,
        COUNTERSIGN_REJECT: actionsDict.confirmRejection,
        OVERTURN_APPROVE: actionsDict.cancelRejection,
        OVERTURN_REJECT: actionsDict.cancelApproval,
        OVERTURN_POSTPONE: actionsDict.postpone,
        FINISH: actionsDict.finishDelivery,
        RECEIVE: actionsDict.confirmReceipt,
        REJECT_RECEIPT: actionsDict.rejectReceipt,
        ARCHIVE: actionsDict.archive,
        RESTORE: actionsDict.restore,
        RESURFACE: actionsDict.resurface,
      }[action] ?? action
    );
  }

  // "تم تعديل <صنف> من 10 إلى 5" / "تم حذف الأصناف: ..." — one notice per
  // decision that touched a line, with the item name resolved from the
  // request's own lines (removed lines are kept, so the name always resolves).
  //
  // Any line whose approved quantity differs from what was asked for, but which
  // no action row accounts for, still gets a notice at the end — unattributed,
  // but present. The card must never show a quantity that silently disagrees
  // with what the requester submitted.
  // Rendered inside the decision's own timeline entry — a quantity cut or a
  // dropped line is something a named official did, not a loose fact about
  // the request.
  function lineEditNotices(request: NeedRequestListItem, edits: RequestActionLineEdit[]) {
    const nameOf = (lineId: string | null) =>
      request.lines.find((line) => line.id === lineId)?.itemNameAr ?? "—";
    const notices = edits
      // before === after is how the server records putting a dropped line
      // back: the line returns at the quantity it already carried, so there
      // is no quantity change to report — only the restore.
      .filter((edit) => !edit.removed && edit.quantityAfter !== edit.quantityBefore)
      .map((edit) =>
        cardDict.lineQuantityChanged
          .replace("{item}", nameOf(edit.lineId))
          .replace("{before}", String(edit.quantityBefore))
          .replace("{after}", String(edit.quantityAfter ?? 0))
      );
    const restored = edits
      .filter((edit) => !edit.removed && edit.quantityAfter === edit.quantityBefore)
      .map((edit) => nameOf(edit.lineId));
    if (restored.length > 0) {
      notices.push(cardDict.linesRestored.replace("{items}", restored.join("، ")));
    }
    const dropped = edits.filter((edit) => edit.removed).map((edit) => nameOf(edit.lineId));
    if (dropped.length > 0) {
      notices.push(cardDict.linesRemoved.replace("{items}", dropped.join("، ")));
    }
    return notices;
  }

  // A line whose approved quantity no action row accounts for: requests
  // decided before V109 created need_request_action_line carry the trimmed
  // quantity but no record of who trimmed it. Shown unattributed rather than
  // hidden, so the card never displays a quantity that silently disagrees
  // with what the requester submitted. Not a fallback for a write that might
  // fail -- verified 2026-08-15 that the edit rows do persist.
  function unattributedEdits(request: NeedRequestListItem) {
    const accountedFor = new Set(
      request.actions.flatMap((action) => (action.lineEdits ?? []).map((edit) => edit.lineId))
    );
    const notices: string[] = [];
    const dropped: string[] = [];
    for (const line of request.lines) {
      if (accountedFor.has(line.id)) continue;
      if (line.removed) {
        dropped.push(line.itemNameAr);
      } else if (line.quantityApproved !== null && line.quantityApproved !== line.quantityRequested) {
        notices.push(
          cardDict.lineQuantityChangedNoActor
            .replace("{item}", line.itemNameAr)
            .replace("{before}", String(line.quantityRequested))
            .replace("{after}", String(line.quantityApproved))
        );
      }
    }
    if (dropped.length > 0) notices.push(cardDict.linesRemoved.replace("{items}", dropped.join("، ")));
    return notices;
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

  // Every decision hits the same shape of endpoint; the overturn variants
  // differ only in the outcome they carry.
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
      await apiFetch<NeedRequestDetail>(`/warehouse/requests/${id}/${DECISION_PATH[kind]}`, {
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

  function decisionTitle(kind: DecisionKind, status: NeedRequestStatusValue) {
    switch (kind) {
      case "approve":
        return modalsDict.approveTitle;
      case "reject":
        return modalsDict.rejectTitle;
      case "postpone":
      case "overturn-postpone":
        return modalsDict.postponeTitle;
      case "countersign":
        return status === "APPROVED_UNDER_REVIEW"
          ? modalsDict.confirmApprovalTitle
          : modalsDict.confirmRejectionTitle;
      case "overturn-reject":
        return modalsDict.cancelApprovalTitle;
      case "overturn-approve":
        return modalsDict.cancelRejectionTitle;
      case "reject-receipt":
        return modalsDict.rejectReceiptTitle;
    }
  }

  // Counter-signing a rejection grants nothing, so it offers no line editor.
  function editableLines(kind: DecisionKind, request: NeedRequestListItem) {
    if (!GRANTS_ITEMS.includes(kind)) return undefined;
    if (kind === "countersign" && request.status !== "APPROVED_UNDER_REVIEW") return undefined;
    return request.lines;
  }

  // Delivery, plus its proof-of-delivery files. The files go up under their
  // own owner type only after the delivery itself is recorded — a failed
  // upload must not lose the stock movement.
  async function deliver(
    id: string,
    body: { lines: { lineId: string; quantityIssued: number }[]; notes: string | null },
    files: File[]
  ) {
    setBusyAction(`${id}:finish`);
    try {
      await apiFetch<NeedRequestDetail>(`/warehouse/requests/${id}/finish`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      let uploadFailed = false;
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        try {
          await apiUpload(`/attachments?ownerType=NEED_REQUEST_DELIVERY&ownerId=${id}`, formData);
        } catch {
          uploadFailed = true;
        }
      }
      setDelivering(null);
      load();
      setToast(uploadFailed ? deliveryDict.attachmentsFailed : commonDict.actionSuccess);
    } catch (error) {
      failToast(error);
    } finally {
      setBusyAction(null);
    }
  }

  // Simple no-body actions: receive and archive.
  async function post(id: string, path: string, body?: unknown) {
    const key = `${id}:${path}`;
    setBusyAction(key);
    try {
      await apiFetch<NeedRequestDetail>(`/warehouse/requests/${id}/${path}`, {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      setDelivering(null);
      load();
      setToast(commonDict.actionSuccess);
    } catch (error) {
      failToast(error);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleExport() {
    const params = new URLSearchParams({ size: "10000" });
    if (status) params.set("status", status);
    if (appliedQuery) params.set("q", appliedQuery);
    if (mine) params.set("mine", "true");
    const all = await apiFetch<PagedResponse<NeedRequestListItem>>(`/warehouse/requests?${params.toString()}`);
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
              <button type="button" className={`btn btn-sm ${status === "PENDING" && !mine && !archived ? "btn-primary" : "btn-outline"}`} onClick={() => selectView("PENDING", false)}>{cardDict.pendingTab}{counts ? ` (${counts.pending})` : ""}</button>
              {permissions.includes("wh.act.countersign") && reviewPolicy?.warehouseTwoLevel && (
                <button type="button" className={`btn btn-sm ${status === "UNDER_REVIEW" ? "btn-primary" : "btn-outline"}`} onClick={() => selectView("UNDER_REVIEW", false)}>{cardDict.reviewTab}{counts ? ` (${counts.underReview})` : ""}</button>
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
            {/* Fixed-width slot: a spinner that appears and disappears inside
                the flex row shifts the search box sideways on every refetch. */}
            <span className="request-filter-spinner-slot" aria-hidden="true">
              {filtering && <span className="spinner" />}
            </span>
          </div>
          <div className="table-toolbar-actions">
            <ExportButton format="xlsx" label={commonDict.exportXlsx} onClick={handleExport} />
            <ExportButton format="pdf" label={commonDict.exportPdf} onClick={() => window.print()} />
            {permissions.includes("wh.request") && (
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
          // Cards, not rows: the legacy screen leads with the status stamp
          // and puts the request's own details underneath, which a table
          // cannot carry without a column per fact.
          <div className="request-cards">
            {page.content.map((request) => (
              <article key={request.id} className="request-card" data-status={request.status}>
                <header className="request-card-head">
                  <h3 className="request-card-title">
                    {dict.cardTitle} — {request.category ? request.category.ar : "—"}
                  </h3>
                  <span className="request-card-state"><span className={`stamp ${STATUS_STAMP_CLASS[request.status]}`}><span className="dot" />{statusLabel(request.status)}</span>{request.status === "POSTPONED" && request.postponedUntil && <time>{request.postponedUntil}</time>}</span>
                </header>

                <div className="request-card-meta">
                  <span className="chip chip-sm">NR-{String(request.requestNumber).padStart(4, "0")}</span>
                  <span>{request.requesterName}</span>
                  {request.department && <span>{request.department.ar}</span>}
                  {formatCardDate(request.actions.find((entry) => entry.action === "SUBMIT")?.createdAt, locale) && (
                    <time className="request-card-meta-date">
                      {formatCardDate(request.actions.find((entry) => entry.action === "SUBMIT")?.createdAt, locale)}
                    </time>
                  )}
                </div>

                {(request.lines?.length ?? 0) > 0 && (
                  <div className="request-item-list">
                    {(request.lines ?? []).map((line) => (
                      <span key={line.id} className={`request-item-chip${line.removed ? " chip-removed" : ""}`}>
                        <b>{line.itemNameAr}</b>
                        <span>
                          {locale === "ar" ? "الكمية المطلوبة" : locale === "hi" ? "अनुरोधित मात्रा" : "Requested quantity"}:
                          <strong>{line.quantityRequested}</strong>
                        </span>
                        {line.quantityApproved != null && line.quantityApproved !== line.quantityRequested && (
                          <small>
                            {locale === "ar" ? "بعد التعديل" : locale === "hi" ? "संशोधन के बाद" : "After adjustment"}:
                            <strong>{line.quantityApproved}</strong>
                          </small>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {unattributedEdits(request).map((notice, index) => (
                  <p key={index} className="request-card-notice">{notice}</p>
                ))}

                {/* The window and the button appear and disappear together.
                    Once it closes there is nothing to say: a note explaining
                    that editing is no longer possible is only useful to
                    someone looking for a button that is already gone. */}
                {request.canEdit && (
                  <p className="edit-note">
                    {cardDict.editNoteActive.replace("{time}", formatEditDeadline(request.editableUntil, locale))}
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setEditRequest(request)}
                    >
                      {actionsDict.edit}
                    </button>
                  </p>
                )}
                {request.status === "POSTPONED" && request.postponedUntil && (
                  <p className="request-card-notice">
                    {cardDict.postponeResurfaceNote.replace("{date}", request.postponedUntil)}
                  </p>
                )}
                {request.returnedBySenior && <p className="request-card-notice">{cardDict.returnedBySenior}</p>}
                {(request.deliveryAttachments?.length ?? 0) > 0 && (
                  <section className="request-card-section">
                    <h4>{cardDict.deliveryAttachments}</h4>
                    <div className="request-card-chips">
                      {request.deliveryAttachments.map((attachment) => (
                        <a key={attachment.id} className="chip chip-sm" href={attachment.url} target="_blank" rel="noopener noreferrer">
                          {attachment.filename}
                        </a>
                      ))}
                    </div>
                  </section>
                )}
                {request.archivedAt && <p className="request-card-notice">{cardDict.archivedNote}</p>}

                {/* Suppressed while postponed: the postpone date is the date
                    that matters, and two competing dates read as a bug. */}
                {request.suggestedStartDate && request.status === "PENDING" && !request.archivedAt && (
                  <SuggestedStartNotice date={request.suggestedStartDate} template={dict.startWorkNotice} locale={locale} />
                )}

                <RequestCardActivity
                  actions={request.actions}
                  attachments={request.attachments}
                  actionLabel={actionLabel}
                  activityTitle={dict.activityTitle}
                  systemActorLabel={cardDict.systemActor}
                  lineEditNotices={(edits) => lineEditNotices(request, edits)}
                  attachmentsDict={attachmentsDict}
                  submissionNote={request.notes}
                />

                {/* Each stage shows only its own actions, and only to the
                    employee entitled to take them. */}
                <div className="request-card-actions">
                  {request.status === "PENDING" && !request.archivedAt && (
                    <>
                      {permissions.includes("wh.act.approve") && (
                        <button type="button" className="btn btn-sm request-decision request-decision-approve" disabled={busyAction !== null} onClick={() => setDecision({ request, kind: "approve" })}>
                          {actionsDict.approve}
                        </button>
                      )}
                      {permissions.includes("wh.act.postpone") && (
                        <button type="button" className="btn btn-sm request-decision request-decision-postpone" disabled={busyAction !== null} onClick={() => setDecision({ request, kind: "postpone" })}>
                          {actionsDict.postpone}
                        </button>
                      )}
                      {permissions.includes("wh.act.reject") && (
                        <button type="button" className="btn btn-sm request-decision request-decision-reject" disabled={busyAction !== null} onClick={() => setDecision({ request, kind: "reject" })}>
                          {actionsDict.reject}
                        </button>
                      )}
                    </>
                  )}

                  {(request.status === "APPROVED_UNDER_REVIEW" || request.status === "REJECTED_UNDER_REVIEW") &&
                    !request.archivedAt &&
                    permissions.includes("wh.act.countersign") && (
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

                  {/* Delivery belongs to the storekeeper, not the requester:
                      the beneficiary must not be the one declaring what left
                      the warehouse. */}
                  {request.status === "APPROVED" &&
                    !request.archivedAt &&
                    permissions.includes("wh.act.finish") && (
                      <button type="button" className="btn btn-sm request-decision request-decision-approve" disabled={busyAction !== null} onClick={() => setDelivering(request)}>
                        {actionsDict.finishDelivery}
                      </button>
                    )}

                  {request.status === "DELIVERED" && !request.archivedAt && request.requesterId === currentEmployeeId && (
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

                  {permissions.includes("emp.manage") && !request.archivedAt && request.status === "CLOSED" && (
                    <button type="button" className="btn btn-outline btn-sm" disabled={busyAction !== null} onClick={() => void post(request.id, "archive")}>
                      {busyAction === `${request.id}:archive` && <span className="spinner" />}
                      {actionsDict.archive}
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setViewRequest(request)}
                  >
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

      {/* Same form, loaded with the request. The server re-checks the edit
          window, so a card left open past the hour cannot save. */}
      {editRequest && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal wide">
            <div className="modal-head">
              <h3>{actionsDict.edit}</h3>
              <button type="button" className="modal-close" onClick={() => setEditRequest(null)} aria-label="close">
                ×
              </button>
            </div>
            <div className="modal-body">
              <NewRequestView
                key={editRequest.id}
                dict={dict}
                commonDict={commonDict}
                errorsDict={errorsDict}
                editing={editRequest}
                onSubmitted={() => {
                  setEditRequest(null);
                  load();
                  setToast(commonDict.actionSuccess);
                }}
                onCancel={() => setEditRequest(null)}
              />
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
          lines={editableLines(decision.kind, decision.request)}
          canEditLines={permissions.includes("wh.act.edit.lines")}
          submitting={busyAction !== null}
          dict={modalsDict}
          commonDict={commonDict}
          onConfirm={(body) => void act(decision.request.id, decision.kind, body)}
          onCancel={() => setDecision(null)}
        />
      )}

      {delivering && (
        <RequestDeliveryDialog
          lines={delivering.lines}
          submitting={busyAction !== null}
          dict={deliveryDict}
          commonDict={commonDict}
          onConfirm={(body, files) => void deliver(delivering.id, body, files)}
          onCancel={() => setDelivering(null)}
        />
      )}

      {viewRequest && (
        <div className="overlay no-print" role="dialog" aria-modal="true" aria-labelledby="request-view-title">
          <div className="modal wide request-view-modal">
            <div className="modal-head">
              <h3 id="request-view-title">
                {dict.cardTitle} — {viewRequest.category?.ar ?? "—"}
              </h3>
              <button type="button" className="modal-close" onClick={() => setViewRequest(null)} aria-label="close">
                ×
              </button>
            </div>
            <div className="modal-body request-form-modal-body">
              <div className="print-pages"><LegacyRequestForm
                title={["نموذج طلب احتياج", "Need Request Form", "आवश्यकता अनुरोध फ़ॉर्म"]}
                subtitle={[viewRequest.category?.ar ?? "—", viewRequest.category?.en ?? "—", "—"]}
                documentNumber={`NR-${String(viewRequest.requestNumber).padStart(4, "0")}`}
                status={statusLabel(viewRequest.status) ?? viewRequest.status}
                statusClass={STATUS_STAMP_CLASS[viewRequest.status] ?? "s-pending"}
                actions={viewRequest.actions}
                actionLabel={actionLabel}
                deliveryReport={{
                  lines: (viewRequest.lines ?? [])
                    .filter((line) => (line.quantityIssued ?? 0) > 0)
                    .map((line) => ({ name: line.itemNameAr, issued: line.quantityIssued ?? 0, unit: line.itemUnit })),
                  releasedBy: viewRequest.actions.find((entry) => entry.action === "FINISH")?.actorName ?? null,
                }}
                attachments={viewRequest.attachments}
                cells={[
                  { label: ["مقدّم الطلب", "Requested by", "अनुरोधकर्ता"], value: viewRequest.requesterName },
                  { label: ["المسمى الوظيفي", "Job Title", "पदनाम"], value: viewRequest.requesterJobTitle ?? "—" },
                  { label: ["القسم / الإدارة", "Department", "विभाग"], value: viewRequest.department?.ar ?? "—" },
                  { label: ["نوع الاحتياج", "Need Type", "आवश्यकता प्रकार"], value: viewRequest.category?.ar ?? "—" },
                  { label: ["تاريخ التقديم", "Submission Date", "प्रस्तुत करने की तिथि"], value: viewRequest.actions.find((a) => a.action === "SUBMIT")?.createdAt?.slice(0, 10) ?? "—" },
                  { label: ["تاريخ بدء العمل المتوقع", "Expected Start Date", "अपेक्षित प्रारंभ तिथि"], value: viewRequest.suggestedStartDate ?? "—" },
                ]}
                sectionTitle={["الأصناف المطلوبة", "Requested Items", "अनुरोधित वस्तुएँ"]}
              >
                <table className="legacy-form-table"><thead><tr><th>الصنف<br/><small>Item</small></th><th>الكمية المطلوبة<br/><small>Requested quantity</small></th><th>الوحدة<br/><small>Unit</small></th></tr></thead><tbody>{(viewRequest.lines ?? []).map((line) => <tr key={line.id}><td>{line.itemNameAr}<br/><small>{line.itemNameEn}</small></td><td><strong>{line.quantityRequested}</strong></td><td>{line.itemUnit || "—"}</td></tr>)}</tbody></table>
                {viewRequest.notes && <><div className="legacy-form-section">ملاحظات <small>Notes</small></div><div className="legacy-form-notes">{viewRequest.notes}</div></>}
              </LegacyRequestForm></div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setViewRequest(null)}>
                {commonDict.cancel}
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
                {commonDict.print}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} error={toast.error} durationMs={toast.error ? 6000 : 3000} onDismiss={() => setToastState(null)} />}
    </>
  );
}
