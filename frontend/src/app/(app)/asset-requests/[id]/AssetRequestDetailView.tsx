"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { AssetRequestDetail } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";
import Toast from "@/components/Toast";

const STATUS_STAMP_CLASS: Record<string, string> = {
  PENDING: "s-pending",
  APPROVED_UNDER_REVIEW: "s-review",
  REJECTED_UNDER_REVIEW: "s-review",
  APPROVED: "s-approved",
  POSTPONED: "s-postponed",
  REJECTED: "s-rejected",
  CLOSED: "s-closed",
};

// Read-only: decisions are taken on the request card, not here.
export default function AssetRequestDetailView({
  id,
  dict,
  commonDict,
  statusDict,
}: {
  id: string;
  dict: Dictionary["assetRequests"];
  commonDict: Dictionary["common"];
  statusDict: Dictionary["requestStatus"];
}) {
  const router = useRouter();
  const [request, setRequest] = useState<AssetRequestDetail | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function load() {
    apiFetch<AssetRequestDetail>(`/asset-requests/${id}`)
      .then(setRequest)
      .catch(() => router.replace("/asset-requests"));
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
  const purposeLabel = request.purpose === "PURCHASE"
    ? dict.purposePurchase
    : request.purpose === "MAINTENANCE"
      ? dict.purposeMaintenance
      : request.purpose === "TRANSFER"
        ? dict.purposeTransfer
        : dict.cardTitle;

  return (
    <>
      <div className="eyebrow">{dict.title}</div>
      <h1 className="section-title disp">{request.requesterName}</h1>
      <div style={{ marginBottom: 18 }}>
        <span className={`stamp ${STATUS_STAMP_CLASS[request.status]}`}>
          <span className="dot" />
          {statusLabel}
        </span>
      </div>

      <div className="panel">
        <div className="panel-body">
          <p style={{ margin: "0 0 8px" }}>
            <strong>{dict.purposeLabel}:</strong> {purposeLabel}
          </p>
          <p style={{ margin: "0 0 8px" }}>
            <strong>{dict.assetLabel}:</strong> {request.assetNumber !== "—" ? `${request.assetNumber} — ` : ""}{request.assetNameAr}
          </p>
          <p style={{ margin: "0 0 8px" }}>
            <strong>{dict.departmentLabel}:</strong> {request.department?.ar ?? "—"}
          </p>
          <p style={{ margin: 0 }}>
            <strong>{dict.reasonLabel}:</strong> {request.reason}
          </p>
        </div>

      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
