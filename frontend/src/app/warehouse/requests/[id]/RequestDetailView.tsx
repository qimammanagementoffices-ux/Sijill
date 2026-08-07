"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { NeedRequestDetail } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

export default function RequestDetailView({
  id,
  dict,
}: {
  id: string;
  dict: Dictionary["warehouseRequests"];
}) {
  const router = useRouter();
  const [request, setRequest] = useState<NeedRequestDetail | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [issuedByLine, setIssuedByLine] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");

  function load() {
    apiFetch<NeedRequestDetail>(`/warehouse/requests/${id}`)
      .then((r) => {
        setRequest(r);
        const defaults: Record<string, string> = {};
        r.lines.forEach((line) => {
          defaults[line.id] = String(line.quantityIssued ?? line.quantityRequested);
        });
        setIssuedByLine(defaults);
      })
      .catch(() => router.replace("/warehouse/requests"));
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

  async function act(action: "approve" | "reject" | "postpone") {
    await apiFetch<NeedRequestDetail>(`/warehouse/requests/${id}/${action}`, {
      method: "POST",
      body: action === "approve" ? undefined : JSON.stringify({ reason: reason || null }),
    });
    load();
  }

  async function finish() {
    await apiFetch<NeedRequestDetail>(`/warehouse/requests/${id}/finish`, {
      method: "POST",
      body: JSON.stringify({
        lines: request!.lines.map((line) => ({
          lineId: line.id,
          quantityIssued: Number(issuedByLine[line.id] ?? line.quantityRequested),
        })),
      }),
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
      <p>{request.notes}</p>

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
                {line.itemNameAr} × {line.quantityRequested}
              </td>
              <td>
                {request.status === "APPROVED" ? (
                  <input
                    type="number"
                    min={0}
                    max={line.quantityRequested}
                    value={issuedByLine[line.id] ?? ""}
                    onChange={(e) => setIssuedByLine({ ...issuedByLine, [line.id]: e.target.value })}
                  />
                ) : (
                  (line.quantityIssued ?? "—")
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {(request.status === "PENDING" || request.status === "APPROVED" || request.status === "POSTPONED") && (
        <label>
          {dict.reasonLabel}
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      )}

      <p>
        {(request.status === "PENDING" || request.status === "POSTPONED") &&
          permissions.includes("wh.act.approve") && (
            <button type="button" onClick={() => act("approve")}>
              {dict.approve}
            </button>
          )}
        {(request.status === "PENDING" || request.status === "APPROVED" || request.status === "POSTPONED") &&
          permissions.includes("wh.act.reject") && (
            <button type="button" onClick={() => act("reject")}>
              {dict.reject}
            </button>
          )}
        {(request.status === "PENDING" || request.status === "APPROVED") &&
          permissions.includes("wh.act.postpone") && (
            <button type="button" onClick={() => act("postpone")}>
              {dict.postpone}
            </button>
          )}
        {request.status === "APPROVED" && permissions.includes("wh.act.finish") && (
          <button type="button" onClick={finish}>
            {dict.finish}
          </button>
        )}
      </p>
    </main>
  );
}
