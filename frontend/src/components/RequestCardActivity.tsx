import type { AttachmentDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

type RequestAction = {
  // Null when the system acted rather than an employee.
  actorName: string | null;
  action: string;
  reason: string | null;
  createdAt: string;
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

export default function RequestCardActivity({
  actions = [],
  attachments = [],
  actionLabel,
  activityTitle,
  attachmentsDict,
  systemActorLabel,
}: {
  actions?: RequestAction[];
  attachments?: AttachmentDto[];
  actionLabel: (action: string) => string;
  activityTitle: string;
  attachmentsDict: Dictionary["attachments"];
  // Shown for entries the system wrote rather than an employee — currently
  // only a postponed request returning to the queue.
  systemActorLabel?: string;
}) {
  return (
    <>
      {attachments.length > 0 && (
        <section className="request-card-section">
          <h4>{attachmentsDict.title}</h4>
          <div className="request-card-chips">
            {attachments.map((attachment) => (
              <a
                key={attachment.id}
                className="chip chip-sm"
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {attachment.filename}
              </a>
            ))}
          </div>
        </section>
      )}

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
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
