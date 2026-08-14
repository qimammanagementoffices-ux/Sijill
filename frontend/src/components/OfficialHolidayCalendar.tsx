"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { OfficialHolidayDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";
import Toast from "@/components/Toast";

export default function OfficialHolidayCalendar({
  dict,
  locale,
  page = false,
}: {
  dict: Dictionary["siteMaintenanceAdmin"];
  locale: string;
  page?: boolean;
}) {
  const router = useRouter();
  const [holidays, setHolidays] = useState<OfficialHolidayDto[] | null>(null);
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    apiFetch<OfficialHolidayDto[]>("/official-holidays")
      .then(setHolidays)
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  async function addHoliday() {
    if (!holidayDate || busy) return;
    setError(null);
    setBusy(true);
    try {
      const holiday = await apiFetch<OfficialHolidayDto>(`/official-holidays/${holidayDate}`, {
        method: "PUT",
        body: JSON.stringify({ name: holidayName || null }),
      });
      setHolidays((current) =>
        [...(current ?? []).filter((item) => item.date !== holiday.date), holiday]
          .sort((a, b) => a.date.localeCompare(b.date))
      );
      setHolidayDate("");
      setHolidayName("");
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeHoliday(date: string) {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/official-holidays/${date}`, { method: "DELETE" });
      setHolidays((current) => (current ?? []).filter((item) => item.date !== date));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function formatHolidayDate(date: string) {
    const dateLocale = locale === "ar" ? "ar-EG" : locale === "hi" ? "hi-IN" : "en-GB";
    return new Intl.DateTimeFormat(dateLocale, { day: "numeric", month: "long", year: "numeric" })
      .format(new Date(`${date}T12:00:00`));
  }

  if (!holidays) return <SectionLoading />;

  return (
    <>
      {page && (
        <>
          <div className="eyebrow">{dict.holidaysTitle}</div>
          <h1 className="section-title disp">{dict.holidaysTitle}</h1>
        </>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {saved && <Toast message={dict.holidaySaved} onDismiss={() => setSaved(false)} />}

      <section className="panel holiday-calendar-panel">
        <div className="panel-head">
          <div>
            {!page && <h2>{dict.holidaysTitle}</h2>}
            <p>{dict.holidaysHint}</p>
          </div>
        </div>
        <div className="panel-body">
          <div className="holiday-calendar-form">
            <div className="field">
              <label>{dict.holidayDateLabel}</label>
              <input type="date" value={holidayDate} onChange={(event) => setHolidayDate(event.target.value)} />
            </div>
            <div className="field holiday-name-field">
              <label>{dict.holidayNameLabel}</label>
              <input
                className="holiday-name-input"
                type="text"
                value={holidayName}
                onChange={(event) => setHolidayName(event.target.value)}
                placeholder={dict.holidayNamePlaceholder}
              />
            </div>
            <button type="button" className="btn btn-primary" onClick={() => void addHoliday()} disabled={!holidayDate || busy}>
              {busy ? <span className="spinner" /> : dict.addHoliday}
            </button>
          </div>

          {holidays.length === 0 ? (
            <div className="empty holiday-empty"><b>{dict.noHolidays}</b></div>
          ) : (
            <div className="holiday-list">
              {holidays.map((holiday) => (
                <article key={holiday.date} className="holiday-item">
                  <span className="holiday-date-mark" aria-hidden="true">{new Date(`${holiday.date}T12:00:00`).getDate()}</span>
                  <div>
                    <strong>{formatHolidayDate(holiday.date)}</strong>
                    {holiday.name && <span>{holiday.name}</span>}
                  </div>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => void removeHoliday(holiday.date)} disabled={busy}>
                    {dict.removeHoliday}
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
