"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { InventoryItemListItem, MaintenanceRequestDetail, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

type PartDraft = { inventoryItemId: string; quantity: string };

export default function MaintenanceRequestDetailView({
  id,
  dict,
}: {
  id: string;
  dict: Dictionary["maintenanceRequests"];
}) {
  const router = useRouter();
  const [request, setRequest] = useState<MaintenanceRequestDetail | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [parts, setParts] = useState<InventoryItemListItem[] | null>(null);
  const [reason, setReason] = useState("");
  const [partDrafts, setPartDrafts] = useState<PartDraft[]>([{ inventoryItemId: "", quantity: "1" }]);

  function load() {
    apiFetch<MaintenanceRequestDetail>(`/maintenance/requests/${id}`)
      .then(setRequest)
      .catch(() => router.replace("/maintenance/requests"));
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
    apiFetch<PagedResponse<InventoryItemListItem>>("/maintenance/parts?size=100")
      .then((p) => setParts(p.content))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, id]);

  async function act(action: "approve" | "reject" | "postpone" | "start") {
    await apiFetch<MaintenanceRequestDetail>(`/maintenance/requests/${id}/${action}`, {
      method: "POST",
      body: action === "approve" || action === "start" ? undefined : JSON.stringify({ reason: reason || null }),
    });
    load();
  }

  function updatePartDraft(index: number, patch: Partial<PartDraft>) {
    setPartDrafts(partDrafts.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function addPartDraft() {
    setPartDrafts([...partDrafts, { inventoryItemId: "", quantity: "1" }]);
  }

  function removePartDraft(index: number) {
    setPartDrafts(partDrafts.filter((_, i) => i !== index));
  }

  async function finish() {
    await apiFetch<MaintenanceRequestDetail>(`/maintenance/requests/${id}/finish`, {
      method: "POST",
      body: JSON.stringify({
        partsUsed: partDrafts
          .filter((d) => d.inventoryItemId)
          .map((d) => ({ inventoryItemId: d.inventoryItemId, quantity: Number(d.quantity) })),
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
    IN_PROGRESS: dict.statusInProgress,
    CLOSED: dict.statusClosed,
  }[request.status];

  const priorityLabel = {
    LOW: dict.priorityLow,
    MEDIUM: dict.priorityMedium,
    HIGH: dict.priorityHigh,
    URGENT: dict.priorityUrgent,
  }[request.priority];

  return (
    <main style={{ maxWidth: 700, margin: "5vh auto", padding: "0 1rem" }}>
      <h1>{request.requesterName}</h1>
      <p>{statusLabel}</p>
      <p>
        {dict.faultTypeLabel}: {request.faultType ? request.faultType.ar : "—"}
      </p>
      <p>
        {dict.locationLabel}: {request.location ?? "—"}
      </p>
      <p>
        {dict.priorityLabel}: {priorityLabel}
      </p>
      <p>{request.description}</p>

      {request.partsUsed.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>{dict.itemLabel}</th>
              <th>{dict.quantityLabel}</th>
            </tr>
          </thead>
          <tbody>
            {request.partsUsed.map((p) => (
              <tr key={p.inventoryItemId}>
                <td>{p.itemNameAr}</td>
                <td>{p.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {request.status === "IN_PROGRESS" && parts && (
        <div>
          <h2>{dict.partsUsedLabel}</h2>
          {partDrafts.map((draft, index) => (
            <div key={index}>
              <select
                value={draft.inventoryItemId}
                onChange={(e) => updatePartDraft(index, { inventoryItemId: e.target.value })}
              >
                <option value="">—</option>
                {parts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.nameAr}
                  </option>
                ))}
              </select>
              <label>
                {dict.quantityLabel}
                <input
                  type="number"
                  min={1}
                  value={draft.quantity}
                  onChange={(e) => updatePartDraft(index, { quantity: e.target.value })}
                />
              </label>
              {partDrafts.length > 1 && (
                <button type="button" onClick={() => removePartDraft(index)}>
                  ×
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addPartDraft}>
            {dict.addPart}
          </button>
        </div>
      )}

      {(request.status === "PENDING" || request.status === "APPROVED" || request.status === "POSTPONED") && (
        <label>
          {dict.reasonLabel}
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      )}

      <p>
        {(request.status === "PENDING" || request.status === "POSTPONED") &&
          permissions.includes("mt.act.approve") && (
            <button type="button" onClick={() => act("approve")}>
              {dict.approve}
            </button>
          )}
        {(request.status === "PENDING" || request.status === "APPROVED" || request.status === "POSTPONED") &&
          permissions.includes("mt.act.reject") && (
            <button type="button" onClick={() => act("reject")}>
              {dict.reject}
            </button>
          )}
        {(request.status === "PENDING" || request.status === "APPROVED") &&
          permissions.includes("mt.act.postpone") && (
            <button type="button" onClick={() => act("postpone")}>
              {dict.postpone}
            </button>
          )}
        {request.status === "APPROVED" && permissions.includes("mt.act.start") && (
          <button type="button" onClick={() => act("start")}>
            {dict.start}
          </button>
        )}
        {request.status === "IN_PROGRESS" && permissions.includes("mt.act.finish") && (
          <button type="button" onClick={finish}>
            {dict.finish}
          </button>
        )}
      </p>
    </main>
  );
}
