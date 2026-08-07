"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { MaintenanceRequestListItem, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

const STATUSES = ["PENDING", "APPROVED", "POSTPONED", "REJECTED", "IN_PROGRESS", "CLOSED"] as const;

export default function MaintenanceRequestList({ dict }: { dict: Dictionary["maintenanceRequests"] }) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState<PagedResponse<MaintenanceRequestListItem> | null>(null);

  function load(statusFilter: string) {
    const query = statusFilter ? `?status=${statusFilter}` : "";
    apiFetch<PagedResponse<MaintenanceRequestListItem>>(`/maintenance/requests${query}`)
      .then(setPage)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.replace("/dashboard");
        }
      });
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function statusLabel(s: string) {
    return {
      PENDING: dict.statusPending,
      APPROVED: dict.statusApproved,
      POSTPONED: dict.statusPostponed,
      REJECTED: dict.statusRejected,
      IN_PROGRESS: dict.statusInProgress,
      CLOSED: dict.statusClosed,
    }[s];
  }

  function priorityLabel(p: string) {
    return {
      LOW: dict.priorityLow,
      MEDIUM: dict.priorityMedium,
      HIGH: dict.priorityHigh,
      URGENT: dict.priorityUrgent,
    }[p];
  }

  if (!page) return null;

  return (
    <main style={{ maxWidth: 900, margin: "5vh auto", padding: "0 1rem" }}>
      <h1>{dict.title}</h1>

      <select
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          load(e.target.value);
        }}
      >
        <option value="">{dict.statusFilterAll}</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {statusLabel(s)}
          </option>
        ))}
      </select>

      <p>
        <Link href="/maintenance/requests/new">{dict.addNew}</Link>
      </p>

      {page.content.length === 0 ? (
        <p>{dict.noResults}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{dict.columnRequester}</th>
              <th>{dict.columnFaultType}</th>
              <th>{dict.columnPriority}</th>
              <th>{dict.columnStatus}</th>
              <th>{dict.columnSuggestedStart}</th>
            </tr>
          </thead>
          <tbody>
            {page.content.map((request) => (
              <tr key={request.id}>
                <td>
                  <Link href={`/maintenance/requests/${request.id}`}>{request.requesterName}</Link>
                </td>
                <td>{request.faultType ? request.faultType.ar : ""}</td>
                <td>{priorityLabel(request.priority)}</td>
                <td>{statusLabel(request.status)}</td>
                <td>{request.suggestedStartDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
