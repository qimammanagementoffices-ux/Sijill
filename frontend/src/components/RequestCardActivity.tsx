import type { AttachmentDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

type RequestAction = {
  actorName: string;
  action: string;
  reason: string | null;
  createdAt: string;
};

const ACTION_TONE: Record<string, string> = {
  SUBMIT: "submitted",
  APPROVE: "approved",
  REJECT: "rejected",
  POSTPONE: "postponed",
  START: "started",
  FINISH: "finished",
};

function formatActionDate(value: string) {
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
}: {
  actions?: RequestAction[];
  attachments?: AttachmentDto[];
  actionLabel: (action: string) => string;
  activityTitle: string;
  attachmentsDict: Dictionary["attachments"];
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
                  {entry.actorName?.trim() && entry.actorName.trim() !== "فارغ" && (
                    <span className="request-timeline-actor">{entry.actorName}</span>
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
