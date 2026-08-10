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
  APPROVED: "s-approved",
  POSTPONED: "s-postponed",
  REJECTED: "s-rejected",
  CLOSED: "s-closed",
};

export default function RequestDetailView({
  id,
  dict,
  commonDict,
  attachmentsDict,
}: {
  id: string;
  dict: Dictionary["warehouseRequests"];
  commonDict: Dictionary["common"];
  attachmentsDict: Dictionary["attachments"];
}) {
  const router = useRouter();
  const [request, setRequest] = useState<NeedRequestDetail | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [issuedByLine, setIssuedByLine] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState<string | null>(null);

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
    setToast(commonDict.actionSuccess);
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
                    {request.status === "APPROVED" ? (
                      <input
                        type="number"
                        min={0}
                        max={line.quantityRequested}
                        value={issuedByLine[line.id] ?? ""}
                        onChange={(e) => setIssuedByLine({ ...issuedByLine, [line.id]: e.target.value })}
                        style={{ border: "1.5px solid var(--line)", borderRadius: 8, padding: "6px 9px", width: 90 }}
                      />
                    ) : (
                      <span className="qty-num">{line.quantityIssued ?? "—"}</span>
                    )}
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
            permissions.includes("wh.act.approve") && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => act("approve")}>
                {dict.approve}
              </button>
            )}
          {(request.status === "PENDING" || request.status === "APPROVED" || request.status === "POSTPONED") &&
            permissions.includes("wh.act.reject") && (
              <button type="button" className="btn btn-seal btn-sm" onClick={() => act("reject")}>
                {dict.reject}
              </button>
            )}
          {(request.status === "PENDING" || request.status === "APPROVED") &&
            permissions.includes("wh.act.postpone") && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => act("postpone")}>
                {dict.postpone}
              </button>
            )}
          {request.status === "APPROVED" && permissions.includes("wh.act.finish") && (
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
