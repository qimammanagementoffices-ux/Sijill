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
  APPROVED: "s-approved",
  POSTPONED: "s-postponed",
  REJECTED: "s-rejected",
  CLOSED: "s-closed",
};

export default function AssetRequestDetailView({
  id,
  dict,
  commonDict,
}: {
  id: string;
  dict: Dictionary["assetRequests"];
  commonDict: Dictionary["common"];
}) {
  const router = useRouter();
  const [request, setRequest] = useState<AssetRequestDetail | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [reason, setReason] = useState("");
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
    apiFetch<{ permissions: string[] }>("/auth/me")
      .then((me) => setPermissions(me.permissions))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, id]);

  async function act(action: "approve" | "reject" | "postpone" | "finish") {
    await apiFetch<AssetRequestDetail>(`/asset-requests/${id}/${action}`, {
      method: "POST",
      body: action === "approve" || action === "finish" ? undefined : JSON.stringify({ reason: reason || null }),
    });
    load();
    setToast(commonDict.actionSuccess);
  }

  if (!request) return <SectionLoading />;

  const statusLabel = {
    PENDING: dict.statusPending,
    APPROVED: dict.statusApproved,
    POSTPONED: dict.statusPostponed,
    REJECTED: dict.statusRejected,
    CLOSED: dict.statusClosed,
  }[request.status];

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
            <strong>{dict.assetLabel}:</strong> {request.assetNumber} — {request.assetNameAr}
          </p>
          <p style={{ margin: 0 }}>
            <strong>{dict.reasonLabel}:</strong> {request.reason}
          </p>
        </div>

        {(request.status === "PENDING" || request.status === "APPROVED" || request.status === "POSTPONED") && (
          <div className="panel-body" style={{ borderTop: "1px solid var(--line-soft)" }}>
            <div className="field" style={{ maxWidth: 360 }}>
              <label>{dict.reasonLabel}</label>
              <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
        )}

        <div className="panel-body" style={{ borderTop: "1px solid var(--line-soft)", display: "flex", gap: 8 }}>
          {(request.status === "PENDING" || request.status === "POSTPONED") &&
            permissions.includes("as.act.approve") && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => act("approve")}>
                {dict.approve}
              </button>
            )}
          {(request.status === "PENDING" || request.status === "APPROVED" || request.status === "POSTPONED") &&
            permissions.includes("as.act.reject") && (
              <button type="button" className="btn btn-seal btn-sm" onClick={() => act("reject")}>
                {dict.reject}
              </button>
            )}
          {(request.status === "PENDING" || request.status === "APPROVED") &&
            permissions.includes("as.act.postpone") && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => act("postpone")}>
                {dict.postpone}
              </button>
            )}
          {request.status === "APPROVED" && permissions.includes("as.act.finish") && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => act("finish")}>
              {dict.finish}
            </button>
          )}
        </div>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
