"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { NeedRequestListItem, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

const STATUSES = ["PENDING", "APPROVED", "POSTPONED", "REJECTED", "CLOSED"] as const;

export default function RequestList({ dict }: { dict: Dictionary["warehouseRequests"] }) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState<PagedResponse<NeedRequestListItem> | null>(null);

  function load(statusFilter: string) {
    const query = statusFilter ? `?status=${statusFilter}` : "";
    apiFetch<PagedResponse<NeedRequestListItem>>(`/warehouse/requests${query}`)
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
      CLOSED: dict.statusClosed,
    }[s];
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
        <Link href="/warehouse/requests/new">{dict.addNew}</Link>
      </p>

      {page.content.length === 0 ? (
        <p>{dict.noResults}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{dict.columnRequester}</th>
              <th>{dict.columnDepartment}</th>
              <th>{dict.columnStatus}</th>
              <th>{dict.columnSuggestedStart}</th>
            </tr>
          </thead>
          <tbody>
            {page.content.map((request) => (
              <tr key={request.id}>
                <td>
                  <Link href={`/warehouse/requests/${request.id}`}>{request.requesterName}</Link>
                </td>
                <td>{request.department ? request.department.ar : ""}</td>
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
