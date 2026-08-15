/**
 * "٧:٤٢ م في ١٥ أغسطس ٢٠٢٦" — when the requester's correction window closes.
 *
 * Always in the school's timezone, never the browser's: someone travelling
 * would otherwise be told a deadline that is not the one the server enforces.
 */
export function formatEditDeadline(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const intlLocale = locale === "ar" ? "ar-EG" : locale === "hi" ? "hi-IN" : "en-GB";
  const day = new Intl.DateTimeFormat(intlLocale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Riyadh",
  }).format(date);
  const time = new Intl.DateTimeFormat(intlLocale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Riyadh",
  }).format(date);
  if (locale === "ar") return `${time} في ${day}`;
  if (locale === "hi") return `${day}, ${time}`;
  return `${time} on ${day}`;
}
