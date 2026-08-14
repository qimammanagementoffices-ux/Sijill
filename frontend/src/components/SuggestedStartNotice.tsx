function dateLocale(locale: string): string {
  if (locale === "ar") return "ar-EG";
  if (locale === "hi") return "hi-IN";
  return "en-GB";
}

export default function SuggestedStartNotice({
  date,
  template,
  locale,
}: {
  date: string;
  template: string;
  locale: string;
}) {
  const formatted = new Intl.DateTimeFormat(dateLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
  const [before, after = ""] = template.split("{date}");

  return (
    <p className="request-card-banner">
      {before}<b>{formatted}</b>{after}
    </p>
  );
}
