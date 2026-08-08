"use client";

import { useEffect } from "react";

// Reusable .toast-wrap/.toast notification -- auto-dismisses after
// `durationMs` (default 3s) so callers don't need their own timer.
export default function Toast({
  message,
  error,
  onDismiss,
  durationMs = 3000,
}: {
  message: string;
  error?: boolean;
  onDismiss: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  return (
    <div className="toast-wrap">
      <div className={`toast${error ? " err" : ""}`}>{message}</div>
    </div>
  );
}
