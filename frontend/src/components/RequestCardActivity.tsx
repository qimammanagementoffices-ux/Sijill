type RequestActionLineEdit = {
  lineId: string | null;
  quantityBefore: number;
  quantityAfter: number | null;
  removed: boolean;
};

type RequestAction = {
  // Null when the system acted rather than an employee.
  actorName: string | null;
  action: string;
  reason: string | null;
  createdAt: string;
  lineEdits?: RequestActionLineEdit[];
};

const ACTION_TONE: Record<string, string> = {
  SUBMIT: "submitted",
  APPROVE: "approved",
  COUNTERSIGN_APPROVE: "approved",
  OVERTURN_APPROVE: "approved",
  REJECT: "rejected",
  COUNTERSIGN_REJECT: "rejected",
  OVERTURN_REJECT: "rejected",
  REJECT_RECEIPT: "rejected",
  POSTPONE: "postponed",
  OVERTURN_POSTPONE: "postponed",
  START: "started",
  FINISH: "finished",
  RECEIVE: "finished",
  RESURFACE: "postponed",
  CANCEL_REMAINDER: "rejected",
};

export function formatActionDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
}

// Attachments are deliberately absent: the card is a summary, and the files
// belong to the printed record. They appear on their own pages in
// "عرض النموذج", which is also what the print view renders.
export default function RequestCardActivity({
  actions = [],
  actionLabel,
  activityTitle,
  systemActorLabel,
  lineEditNotices,
  submissionNote,
}: {
  actions?: RequestAction[];
  actionLabel: (action: string) => string;
  activityTitle: string;
  // Shown for entries the system wrote rather than an employee — currently
  // only a postponed request returning to the queue.
  systemActorLabel?: string;
  // "تم تعديل صنف من 5 إلى 2" / "تم حذف الأصناف: ..." for one decision.
  // Rendered inside that decision's entry, not loose on the card: a quantity
  // change is something an official did, and it has to read as theirs.
  lineEditNotices?: (edits: RequestActionLineEdit[]) => string[];
  // The requester's note belongs to the submission event (step 1), rather
  // than floating separately above the history.
  submissionNote?: string | null;
}) {
  return (
    <>
      {actions.length > 0 && (
        <section className="request-card-section">
          <h4>{activityTitle}</h4>
          <ol className="request-card-timeline">
            {actions.map((entry, index) => (
              <li key={`${entry.createdAt}-${entry.action}-${index}`} className={`request-timeline-${ACTION_TONE[entry.action] ?? "default"}`}>
                <span className="request-timeline-marker" aria-hidden="true">{index + 1}</span>
                <div className="request-timeline-content">
                  <div className="request-timeline-head">
                    <b className="request-timeline-status">{actionLabel(entry.action)}</b>
                    <time dateTime={entry.createdAt}>{formatActionDate(entry.createdAt)}</time>
                  </div>
                  {entry.actorName?.trim() && entry.actorName.trim() !== "فارغ" ? (
                    <span className="request-timeline-actor">{entry.actorName}</span>
                  ) : (
                    systemActorLabel && <span className="request-timeline-actor">{systemActorLabel}</span>
                  )}
                  {entry.reason && <p>{entry.reason}</p>}
                  {entry.action === "SUBMIT" && submissionNote && (
                    <p className="request-timeline-note">{submissionNote}</p>
                  )}
                  {(lineEditNotices?.(entry.lineEdits ?? []) ?? []).map((notice, noticeIndex) => (
                    <p key={noticeIndex} className="request-timeline-edit">{notice}</p>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
