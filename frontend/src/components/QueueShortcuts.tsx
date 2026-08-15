"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import type { PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

type Queue = {
  key: string;
  label: string;
  href: string;
  count: number;
};

// Each queue is one size=1 request against the list endpoint it links to,
// rather than a dedicated counts endpoint. That keeps a single definition of
// what belongs in a queue -- including the department scope, which a separate
// count query would have to duplicate and could drift from. The dashboard
// would otherwise promise work the list refuses to show.
const SOURCES = [
  { key: "warehousePending", path: "/warehouse/requests", query: "status=PENDING", href: "/warehouse/requests", permission: "wh.act.approve", tab: "pending" },
  { key: "warehouseReview", path: "/warehouse/requests", query: "underReview=true", href: "/warehouse/requests?tab=review", permission: "wh.act.countersign", tab: "review" },
  { key: "maintenancePending", path: "/maintenance/requests", query: "status=PENDING", href: "/maintenance/requests", permission: "mt.act.approve", tab: "pending" },
  { key: "maintenanceReview", path: "/maintenance/requests", query: "underReview=true", href: "/maintenance/requests?tab=review", permission: "mt.act.countersign", tab: "review" },
  { key: "assetPending", path: "/asset-requests", query: "status=PENDING", href: "/asset-requests", permission: "as.act.approve", tab: "pending" },
  { key: "assetReview", path: "/asset-requests", query: "underReview=true", href: "/asset-requests?tab=review", permission: "as.act.countersign", tab: "review" },
] as const;

export default function QueueShortcuts({
  permissions,
  dict,
  cardDict,
}: {
  permissions: string[];
  dict: Dictionary["dashboard"];
  cardDict: Dictionary["requestCard"];
}) {
  const [queues, setQueues] = useState<Queue[]>([]);

  useEffect(() => {
    const mine = SOURCES.filter((source) => permissions.includes(source.permission));
    if (mine.length === 0) return;

    const systemLabel: Record<string, string> = {
      "/warehouse/requests": dict.warehouseRequestsNav,
      "/maintenance/requests": dict.maintenanceRequestsNav,
      "/asset-requests": dict.assetRequestsNav,
    };

    Promise.all(
      mine.map((source) =>
        apiFetch<PagedResponse<unknown>>(`${source.path}?${source.query}&size=1`)
          .then((page): Queue | null => ({
            key: source.key,
            label: `${systemLabel[source.path]} — ${source.tab === "review" ? cardDict.reviewTab : cardDict.pendingTab}`,
            href: source.href,
            count: page.totalElements,
          }))
          // A queue that fails to load is left out rather than shown as zero:
          // "nothing waiting" and "we could not ask" are different answers.
          .catch(() => null)
      )
    ).then((results) => setQueues(results.filter((queue): queue is Queue => queue !== null && queue.count > 0)));
  }, [permissions, dict, cardDict]);

  if (queues.length === 0) return null;

  return (
    <section className="dashboard-queues no-print">
      {queues.map((queue) => (
        <Link key={queue.key} href={queue.href} className="dashboard-queue">
          <span className="dashboard-queue-count">{queue.count}</span>
          <span className="dashboard-queue-label">{queue.label}</span>
        </Link>
      ))}
    </section>
  );
}
