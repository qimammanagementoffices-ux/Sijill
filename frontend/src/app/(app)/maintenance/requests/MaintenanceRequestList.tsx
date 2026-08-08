"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import { exportToXlsx } from "@/lib/exportXlsx";
import PrintReportHeader from "@/components/PrintReportHeader";
import SectionLoading from "@/components/SectionLoading";
import type { MaintenanceRequestListItem, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

const STATUSES = ["PENDING", "APPROVED", "POSTPONED", "REJECTED", "IN_PROGRESS", "CLOSED"] as const;
const STATUS_STAMP_CLASS: Record<string, string> = {
  PENDING: "s-pending",
  APPROVED: "s-approved",
  POSTPONED: "s-postponed",
  REJECTED: "s-rejected",
  IN_PROGRESS: "s-progress",
  CLOSED: "s-closed",
};

export default function MaintenanceRequestList({
  dict,
  commonDict,
}: {
  dict: Dictionary["maintenanceRequests"];
  commonDict: Dictionary["common"];
}) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState<PagedResponse<MaintenanceRequestListItem> | null>(null);
  const [filtering, setFiltering] = useState(false);

  function load(statusFilter: string) {
    const query = statusFilter ? `?status=${statusFilter}` : "";
    setFiltering(true);
    apiFetch<PagedResponse<MaintenanceRequestListItem>>(`/maintenance/requests${query}`)
      .then(setPage)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.replace("/dashboard");
        }
      })
      .finally(() => setFiltering(false));
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

  async function handleExport() {
    const query = status ? `?status=${status}&size=10000` : "?size=10000";
    const all = await apiFetch<PagedResponse<MaintenanceRequestListItem>>(`/maintenance/requests${query}`);
    await exportToXlsx(
      dict.title,
      dict.title,
      [
        { header: dict.columnRequester, value: (r: MaintenanceRequestListItem) => r.requesterName },
        { header: dict.columnFaultType, value: (r: MaintenanceRequestListItem) => r.faultType?.ar ?? "" },
        { header: dict.columnPriority, value: (r: MaintenanceRequestListItem) => priorityLabel(r.priority) ?? r.priority },
        { header: dict.columnStatus, value: (r: MaintenanceRequestListItem) => statusLabel(r.status) ?? r.status },
        { header: dict.columnSuggestedStart, value: (r: MaintenanceRequestListItem) => r.suggestedStartDate ?? "" },
      ],
      all.content
    );
  }

  if (!page) return <SectionLoading />;

  return (
    <>
      <div className="no-print">
        <div className="eyebrow">{dict.title}</div>
        <h1 className="section-title disp">{dict.title}</h1>
      </div>
      <div className="print-only">
        <PrintReportHeader title={dict.title} dict={commonDict} />
      </div>

      <div className="panel">
        <div className="panel-head no-print">
          <div className="filter-row">
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
            {filtering && <span className="spinner" />}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleExport}>
              {commonDict.exportXlsx}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => window.print()}>
              {commonDict.print}
            </button>
            <Link href="/maintenance/requests/new" className="btn btn-primary btn-sm">
              {dict.addNew}
            </Link>
          </div>
        </div>

        {page.content.length === 0 ? (
          <div className="empty">
            <b>{dict.noResults}</b>
          </div>
        ) : (
          <div className="table-scroll">
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
                  <tr
                    key={request.id}
                    className="clickable"
                    onClick={() => router.push(`/maintenance/requests/${request.id}`)}
                  >
                    <td>
                      <Link href={`/maintenance/requests/${request.id}`}>{request.requesterName}</Link>
                    </td>
                    <td>{request.faultType ? request.faultType.ar : ""}</td>
                    <td>
                      <span className="chip chip-sm">{priorityLabel(request.priority)}</span>
                    </td>
                    <td>
                      <span className={`stamp ${STATUS_STAMP_CLASS[request.status]}`}>
                        <span className="dot" />
                        {statusLabel(request.status)}
                      </span>
                    </td>
                    <td className="mono">{request.suggestedStartDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
