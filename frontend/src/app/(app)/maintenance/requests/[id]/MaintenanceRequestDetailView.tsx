"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { InventoryItemListItem, MaintenanceRequestDetail, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";
import Toast from "@/components/Toast";

type PartDraft = { inventoryItemId: string; quantity: string };

const STATUS_STAMP_CLASS: Record<string, string> = {
  PENDING: "s-pending",
  APPROVED: "s-approved",
  POSTPONED: "s-postponed",
  REJECTED: "s-rejected",
  IN_PROGRESS: "s-progress",
  CLOSED: "s-closed",
};

export default function MaintenanceRequestDetailView({
  id,
  dict,
  commonDict,
}: {
  id: string;
  dict: Dictionary["maintenanceRequests"];
  commonDict: Dictionary["common"];
}) {
  const router = useRouter();
  const [request, setRequest] = useState<MaintenanceRequestDetail | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [parts, setParts] = useState<InventoryItemListItem[] | null>(null);
  const [reason, setReason] = useState("");
  const [partDrafts, setPartDrafts] = useState<PartDraft[]>([{ inventoryItemId: "", quantity: "1" }]);
  const [toast, setToast] = useState<string | null>(null);

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
    setToast(commonDict.actionSuccess);
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
    setToast(commonDict.actionSuccess);
  }

  if (!request) return <SectionLoading />;

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
    <>
      <div className="eyebrow">{dict.title}</div>
      <h1 className="section-title disp">{request.requesterName}</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <span className={`stamp ${STATUS_STAMP_CLASS[request.status]}`}>
          <span className="dot" />
          {statusLabel}
        </span>
        <span className="chip chip-sm">{priorityLabel}</span>
      </div>

      <div className="panel">
        <div className="panel-body">
          <div className="form-grid full">
            <p style={{ margin: 0 }}>
              <strong>{dict.faultTypeLabel}:</strong> {request.faultType ? request.faultType.ar : "—"}
            </p>
            <p style={{ margin: 0 }}>
              <strong>{dict.locationLabel}:</strong> {request.location ?? "—"}
            </p>
            <p style={{ margin: 0 }}>{request.description}</p>
          </div>
        </div>

        {request.partsUsed.length > 0 && (
          <div className="table-scroll">
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
                    <td className="qty-num">{p.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {request.status === "IN_PROGRESS" && !parts && (
          <div className="panel-body" style={{ borderTop: "1px solid var(--line-soft)" }}>
            <h3 style={{ marginTop: 0 }}>{dict.partsUsedLabel}</h3>
            <span className="spinner" />
          </div>
        )}

        {request.status === "IN_PROGRESS" && parts && (
          <div className="panel-body" style={{ borderTop: "1px solid var(--line-soft)" }}>
            <h3 style={{ marginTop: 0 }}>{dict.partsUsedLabel}</h3>
            {partDrafts.map((draft, index) => (
              <div key={index} className="form-grid" style={{ marginBottom: 10, alignItems: "end" }}>
                <div className="field">
                  <select value={draft.inventoryItemId} onChange={(e) => updatePartDraft(index, { inventoryItemId: e.target.value })}>
                    <option value="">—</option>
                    {parts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} — {item.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label>{dict.quantityLabel}</label>
                    <input
                      type="number"
                      min={1}
                      value={draft.quantity}
                      onChange={(e) => updatePartDraft(index, { quantity: e.target.value })}
                    />
                  </div>
                  {partDrafts.length > 1 && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removePartDraft(index)}>
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-outline btn-sm" onClick={addPartDraft}>
              {dict.addPart}
            </button>
          </div>
        )}

        {(request.status === "PENDING" || request.status === "APPROVED" || request.status === "POSTPONED") && (
          <div className="panel-body" style={{ borderTop: "1px solid var(--line-soft)" }}>
            <div className="field" style={{ maxWidth: 360 }}>
              <label>{dict.reasonLabel}</label>
              <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
        )}

        <div className="panel-body" style={{ borderTop: "1px solid var(--line-soft)", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(request.status === "PENDING" || request.status === "POSTPONED") &&
            permissions.includes("mt.act.approve") && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => act("approve")}>
                {dict.approve}
              </button>
            )}
          {(request.status === "PENDING" || request.status === "APPROVED" || request.status === "POSTPONED") &&
            permissions.includes("mt.act.reject") && (
              <button type="button" className="btn btn-seal btn-sm" onClick={() => act("reject")}>
                {dict.reject}
              </button>
            )}
          {(request.status === "PENDING" || request.status === "APPROVED") &&
            permissions.includes("mt.act.postpone") && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => act("postpone")}>
                {dict.postpone}
              </button>
            )}
          {request.status === "APPROVED" && permissions.includes("mt.act.start") && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => act("start")}>
              {dict.start}
            </button>
          )}
          {request.status === "IN_PROGRESS" && permissions.includes("mt.act.finish") && (
            <button type="button" className="btn btn-primary btn-sm" onClick={finish}>
              {dict.finish}
            </button>
          )}
        </div>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
