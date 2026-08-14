"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { NeedRequestDetail } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";
import AttachmentUploader from "@/components/AttachmentUploader";
import Toast from "@/components/Toast";

const STATUS_STAMP_CLASS: Record<string, string> = {
  PENDING: "s-pending",
  APPROVED_UNDER_REVIEW: "s-review",
  REJECTED_UNDER_REVIEW: "s-review",
  APPROVED: "s-approved",
  POSTPONED: "s-postponed",
  REJECTED: "s-rejected",
  DELIVERED: "s-delivered",
  CLOSED: "s-closed",
};

// Read-only. Every decision in the workflow is taken on the request card, so
// this page shows the request and its evidence rather than a second, divergent
// copy of the action buttons.
export default function RequestDetailView({
  id,
  dict,
  commonDict,
  attachmentsDict,
  statusDict,
}: {
  id: string;
  dict: Dictionary["warehouseRequests"];
  commonDict: Dictionary["common"];
  attachmentsDict: Dictionary["attachments"];
  statusDict: Dictionary["requestStatus"];
}) {
  const router = useRouter();
  const [request, setRequest] = useState<NeedRequestDetail | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function load() {
    apiFetch<NeedRequestDetail>(`/warehouse/requests/${id}`)
      .then(setRequest)
      .catch(() => router.replace("/warehouse/requests"));
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, id]);

  if (!request) return <SectionLoading />;

  const statusLabel = statusDict[request.status] ?? request.status;

  return (
    <>
      <div className="eyebrow">{dict.title}</div>
      <h1 className="section-title disp">{request.requesterName}</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <span className={`stamp ${STATUS_STAMP_CLASS[request.status]}`}>
          <span className="dot" />
          {statusLabel}
        </span>
        {request.room && (
          <span style={{ fontSize: 12.5, color: "var(--slate)" }}>
            {dict.roomLabel}: {request.room.ar}
          </span>
        )}
        {request.notes && <span style={{ fontSize: 12.5, color: "var(--slate)" }}>{request.notes}</span>}
      </div>

      <div className="panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{dict.quantityRequestedLabel}</th>
                <th>{dict.quantityIssuedLabel}</th>
              </tr>
            </thead>
            <tbody>
              {request.lines.map((line) => (
                <tr key={line.id}>
                  <td>
                    {line.itemNameAr} × <span className="qty-num">{line.quantityRequested}</span>
                  </td>
                  <td>
                    <span className="qty-num">{line.quantityIssued ?? "—"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel-body" style={{ borderTop: "1px solid var(--line-soft)" }}>
          <AttachmentUploader
            ownerType="NEED_REQUEST"
            ownerId={request.id}
            dict={attachmentsDict}
            // Once a request is decided, its evidence stops being editable --
            // only an open request accepts new or removed attachments.
            canManage={request.status === "PENDING" || request.status === "POSTPONED"}
            onAction={() => setToast(commonDict.actionSuccess)}
          />
        </div>

      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
