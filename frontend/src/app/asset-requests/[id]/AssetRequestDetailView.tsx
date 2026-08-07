"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { AssetRequestDetail } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

export default function AssetRequestDetailView({ id, dict }: { id: string; dict: Dictionary["assetRequests"] }) {
  const router = useRouter();
  const [request, setRequest] = useState<AssetRequestDetail | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [reason, setReason] = useState("");

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
  }

  if (!request) return null;

  const statusLabel = {
    PENDING: dict.statusPending,
    APPROVED: dict.statusApproved,
    POSTPONED: dict.statusPostponed,
    REJECTED: dict.statusRejected,
    CLOSED: dict.statusClosed,
  }[request.status];

  return (
    <main style={{ maxWidth: 700, margin: "5vh auto", padding: "0 1rem" }}>
      <h1>{request.requesterName}</h1>
      <p>{statusLabel}</p>
      <p>
        {dict.assetLabel}: {request.assetNumber} — {request.assetNameAr}
      </p>
      <p>
        {dict.reasonLabel}: {request.reason}
      </p>

      {(request.status === "PENDING" || request.status === "APPROVED" || request.status === "POSTPONED") && (
        <label>
          {dict.reasonLabel}
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      )}

      <p>
        {(request.status === "PENDING" || request.status === "POSTPONED") &&
          permissions.includes("as.act.approve") && (
            <button type="button" onClick={() => act("approve")}>
              {dict.approve}
            </button>
          )}
        {(request.status === "PENDING" || request.status === "APPROVED" || request.status === "POSTPONED") &&
          permissions.includes("as.act.reject") && (
            <button type="button" onClick={() => act("reject")}>
              {dict.reject}
            </button>
          )}
        {(request.status === "PENDING" || request.status === "APPROVED") &&
          permissions.includes("as.act.postpone") && (
            <button type="button" onClick={() => act("postpone")}>
              {dict.postpone}
            </button>
          )}
        {request.status === "APPROVED" && permissions.includes("as.act.finish") && (
          <button type="button" onClick={() => act("finish")}>
            {dict.finish}
          </button>
        )}
      </p>
    </main>
  );
}
