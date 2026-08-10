"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import { exportToXlsx } from "@/lib/exportXlsx";
import PrintReportHeader from "@/components/PrintReportHeader";
import SectionLoading from "@/components/SectionLoading";
import NewRequestView from "@/components/NewRequestView";
import Toast from "@/components/Toast";
import type { NeedRequestDetail, NeedRequestListItem, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

const STATUSES = ["PENDING", "APPROVED", "POSTPONED", "REJECTED", "CLOSED"] as const;
const STATUS_STAMP_CLASS: Record<string, string> = {
  PENDING: "s-pending",
  APPROVED: "s-approved",
  POSTPONED: "s-postponed",
  REJECTED: "s-rejected",
  CLOSED: "s-closed",
};

export default function RequestList({
  dict,
  errorsDict,
  commonDict,
}: {
  dict: Dictionary["warehouseRequests"];
  errorsDict: Dictionary["errors"];
  commonDict: Dictionary["common"];
}) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState<PagedResponse<NeedRequestListItem> | null>(null);
  const [filtering, setFiltering] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [, setAddSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function load(statusFilter: string) {
    const query = statusFilter ? `?status=${statusFilter}` : "";
    setFiltering(true);
    apiFetch<PagedResponse<NeedRequestListItem>>(`/warehouse/requests${query}`)
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
      CLOSED: dict.statusClosed,
    }[s];
  }

  async function handleExport() {
    const query = status ? `?status=${status}&size=10000` : "?size=10000";
    const all = await apiFetch<PagedResponse<NeedRequestListItem>>(`/warehouse/requests${query}`);
    await exportToXlsx(
      dict.title,
      dict.title,
      [
        { header: dict.columnRequester, value: (r: NeedRequestListItem) => r.requesterName },
        { header: dict.columnDepartment, value: (r: NeedRequestListItem) => r.department?.ar ?? "" },
        { header: dict.columnStatus, value: (r: NeedRequestListItem) => statusLabel(r.status) ?? r.status },
        { header: dict.columnSuggestedStart, value: (r: NeedRequestListItem) => r.suggestedStartDate ?? "" },
      ],
      all.content
    );
  }

  function handleAdded(request: NeedRequestDetail) {
    setShowAddModal(false);
    load(status);
    setToast(commonDict.actionSuccess);
    void request;
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
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
              {dict.addNew}
            </button>
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
                  <th>{dict.columnDepartment}</th>
                  <th>{dict.columnStatus}</th>
                  <th>{dict.columnSuggestedStart}</th>
                </tr>
              </thead>
              <tbody>
                {page.content.map((request) => (
                  <tr key={request.id} className="clickable" onClick={() => router.push(`/warehouse/requests/${request.id}`)}>
                    <td>
                      <Link href={`/warehouse/requests/${request.id}`}>{request.requesterName}</Link>
                    </td>
                    <td>{request.department ? request.department.ar : ""}</td>
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

      {showAddModal && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal wide">
            <div className="modal-head">
              <h3>{dict.addNew}</h3>
              <button type="button" className="modal-close" onClick={() => setShowAddModal(false)} aria-label="close">
                ×
              </button>
            </div>
            <div className="modal-body">
              <NewRequestView
                dict={dict}
                commonDict={commonDict}
                errorsDict={errorsDict}
                onSubmitted={handleAdded}
                onSubmittingChange={setAddSubmitting}
                onCancel={() => setShowAddModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
