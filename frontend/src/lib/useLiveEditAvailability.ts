"use client";

import { useEffect, useState } from "react";

type EditableRequest = {
  canEdit: boolean;
  requesterId: string;
  editableUntil: string;
};

/**
 * Keeps the requester's one-hour edit window accurate without polling the API.
 * Administrative edit permission is not time-limited, so only the requester's
 * own deadline participates in the timer.
 */
export function useLiveEditAvailability<T extends EditableRequest>(
  requests: readonly T[] | undefined,
  currentEmployeeId: string,
) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const nextDeadline = Math.min(
      ...(requests ?? [])
        .filter((request) => request.canEdit && request.requesterId === currentEmployeeId)
        .map((request) => Date.parse(request.editableUntil))
        .filter((deadline) => Number.isFinite(deadline) && deadline > now),
    );
    if (!Number.isFinite(nextDeadline)) return;

    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(0, nextDeadline - Date.now() + 25),
    );
    return () => window.clearTimeout(timer);
  }, [requests, currentEmployeeId, now]);

  return (request: T) => {
    if (!request.canEdit) return false;
    if (request.requesterId !== currentEmployeeId) return true;
    const deadline = Date.parse(request.editableUntil);
    return Number.isFinite(deadline) && deadline > now;
  };
}
