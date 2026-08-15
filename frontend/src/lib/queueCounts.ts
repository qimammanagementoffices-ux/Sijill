"use client";

import { useCallback, useState } from "react";
import { apiFetch } from "./apiClient";
import type { PagedResponse } from "./types";

/**
 * Counts for the two queue tabs.
 *
 * These used to be read off the page currently loaded, which meant a tab only
 * ever knew its own count, and only after you had already clicked it -- the
 * queue you have not opened is exactly the one whose size you want to see.
 * Asking for size=1 makes each call a count rather than a page of data.
 *
 * Only the queues are counted. "All requests" and the archive are places you
 * go looking for something, not work waiting on you, so a number there is
 * noise.
 */
export function useQueueCounts(basePath: string, includeUnderReview: boolean) {
  const [counts, setCounts] = useState<{ pending: number; underReview: number } | null>(null);

  const refreshCounts = useCallback(() => {
    const total = (query: string) =>
      apiFetch<PagedResponse<unknown>>(`${basePath}?${query}&size=1`).then((page) => page.totalElements);

    Promise.all([
      total("status=PENDING"),
      includeUnderReview ? total("underReview=true") : Promise.resolve(0),
    ])
      .then(([pending, underReview]) => setCounts({ pending, underReview }))
      // A badge that fails to load should stay absent, not raise an error over
      // the list it decorates.
      .catch(() => {});
  }, [basePath, includeUnderReview]);

  return { counts, refreshCounts };
}
