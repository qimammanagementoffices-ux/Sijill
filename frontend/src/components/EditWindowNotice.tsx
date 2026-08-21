import { formatEditDeadline } from "@/lib/formatEditDeadline";

/**
 * Tells the requester how long they still have to correct their own request.
 *
 * Shown only to the requester: a moderator's edit rights are not time-boxed,
 * so the deadline would be a lie to them. Once the hour is up the notice
 * stays, in its expired form -- the edit button disappearing without a word
 * is what made the window invisible in the first place.
 */
export default function EditWindowNotice({
  editableUntil,
  locale,
  activeTemplate,
  expiredTemplate,
}: {
  editableUntil: string;
  locale: string;
  activeTemplate: string;
  expiredTemplate: string;
}) {
  const until = new Date(editableUntil);
  if (Number.isNaN(until.getTime())) return null;

  if (until.getTime() <= Date.now()) {
    return <p className="request-card-notice">{expiredTemplate}</p>;
  }

  const [before, after = ""] = activeTemplate.split("{time}");
  return (
    <p className="request-card-banner">
      {before}
      <b>{formatEditDeadline(editableUntil, locale)}</b>
      {after}
    </p>
  );
}
