import type { AttachmentDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

type RequestAction = {
  actorName: string;
  action: string;
  reason: string | null;
  createdAt: string;
};

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
              <li key={`${entry.createdAt}-${entry.action}-${index}`}>
                <div>
                  <b>{actionLabel(entry.action)}</b>
                  <span>{entry.actorName}</span>
                  <time dateTime={entry.createdAt}>
                    {new Date(entry.createdAt).toISOString().slice(0, 16).replace("T", " ")} UTC
                  </time>
                </div>
                {entry.reason && <p>{entry.reason}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
