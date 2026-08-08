"use client";

import { useEffect, useState } from "react";
import type { MaintenanceDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

function remaining(reopenAt: string, now: number) {
  const diffMs = new Date(reopenAt).getTime() - now;
  if (diffMs <= 0) return null;
  const totalSeconds = Math.floor(diffMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

// Rendered in place by MaintenanceGate wherever the visitor was trying to
// go — not a routable page of its own, so it works for every URL uniformly
// rather than needing every route to redirect to one specific path.
export default function MaintenancePage({
  status,
  dict,
}: {
  status: MaintenanceDto;
  dict: Dictionary["siteMaintenancePage"];
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!status.reopenAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [status.reopenAt]);

  const left = status.reopenAt ? remaining(status.reopenAt, now) : null;
  const message = status.messageAr || dict.defaultMessage;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      {status.imageUrl && <img src={status.imageUrl} alt="" style={{ maxWidth: 320, marginBottom: "1.5rem" }} />}
      <h1>{dict.title}</h1>
      <p>{message}</p>
      {left && (
        <p>
          {dict.reopenLabel}: {left.days}
          {dict.reopenUnitDays} {left.hours}
          {dict.reopenUnitHours} {left.minutes}
          {dict.reopenUnitMinutes} {left.seconds}
          {dict.reopenUnitSeconds}
        </p>
      )}
    </main>
  );
}
