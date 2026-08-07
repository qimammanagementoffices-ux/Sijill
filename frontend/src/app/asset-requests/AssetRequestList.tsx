"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import { exportToXlsx } from "@/lib/exportXlsx";
import PrintReportHeader from "@/components/PrintReportHeader";
import type { AssetRequestListItem, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

const STATUSES = ["PENDING", "APPROVED", "POSTPONED", "REJECTED", "CLOSED"] as const;

export default function AssetRequestList({
  dict,
  commonDict,
}: {
  dict: Dictionary["assetRequests"];
  commonDict: Dictionary["common"];
}) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState<PagedResponse<AssetRequestListItem> | null>(null);

  function load(statusFilter: string) {
    const query = statusFilter ? `?status=${statusFilter}` : "";
    apiFetch<PagedResponse<AssetRequestListItem>>(`/asset-requests${query}`)
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

  async function handleExport() {
    const query = status ? `?status=${status}&size=10000` : "?size=10000";
    const all = await apiFetch<PagedResponse<AssetRequestListItem>>(`/asset-requests${query}`);
    await exportToXlsx(
      dict.title,
      dict.title,
      [
        { header: dict.columnRequester, value: (r: AssetRequestListItem) => r.requesterName },
        { header: dict.columnAsset, value: (r: AssetRequestListItem) => `${r.assetNumber} — ${r.assetNameAr}` },
        { header: dict.columnStatus, value: (r: AssetRequestListItem) => statusLabel(r.status) ?? r.status },
        { header: dict.columnSuggestedStart, value: (r: AssetRequestListItem) => r.suggestedStartDate ?? "" },
      ],
      all.content
    );
  }

  if (!page) return null;

  return (
    <main style={{ maxWidth: 900, margin: "5vh auto", padding: "0 1rem" }}>
      <PrintReportHeader title={dict.title} dict={commonDict} />

      <p className="no-print">
        <button type="button" onClick={handleExport}>
          {commonDict.exportXlsx}
        </button>
        <button type="button" onClick={() => window.print()}>
          {commonDict.print}
        </button>
      </p>

      <select
        className="no-print"
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

      <p className="no-print">
        <Link href="/asset-requests/new">{dict.addNew}</Link>
      </p>

      {page.content.length === 0 ? (
        <p>{dict.noResults}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{dict.columnRequester}</th>
              <th>{dict.columnAsset}</th>
              <th>{dict.columnStatus}</th>
              <th>{dict.columnSuggestedStart}</th>
            </tr>
          </thead>
          <tbody>
            {page.content.map((request) => (
              <tr key={request.id}>
                <td>
                  <Link href={`/asset-requests/${request.id}`}>{request.requesterName}</Link>
                </td>
                <td>
                  {request.assetNumber} — {request.assetNameAr}
                </td>
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
