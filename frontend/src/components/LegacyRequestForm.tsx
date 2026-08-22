"use client";

import { useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { AttachmentDto, BrandingDto } from "@/lib/types";

type FormCell = { label: [string, string, string]; value: ReactNode };
type FormAction = { actorName: string | null; action: string; reason: string | null; createdAt: string };

function TriLabel({ text }: { text: [string, string, string] }) {
  return <span className="legacy-tri-label"><b>{text[0]}</b><small>{text[1]}</small><small>{text[2]}</small></span>;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
}

export default function LegacyRequestForm({
  title,
  subtitle,
  documentNumber,
  status,
  statusClass,
  cells,
  sectionTitle,
  children,
  actions = [],
  attachments = [],
  actionLabel,
  deliveryReport,
}: {
  title: [string, string, string];
  subtitle: [string, string, string];
  documentNumber: string;
  status: string;
  statusClass: string;
  cells: FormCell[];
  sectionTitle?: [string, string, string];
  children?: ReactNode;
  actions?: FormAction[];
  attachments?: AttachmentDto[];
  // The caller's translated labels. This used to be a local Arabic-only map
  // that knew six actions, so every action added since -- counter-signing,
  // overturning, resurfacing -- printed its raw enum name in all languages.
  actionLabel: (action: string) => string;
  // What actually left the store, and who released it. Only present once a
  // delivery has been recorded.
  deliveryReport?: { lines: { name: string; issued: number; unit: string | null }[]; releasedBy: string | null };
}) {
  const [branding, setBranding] = useState<BrandingDto | null>(null);
  useEffect(() => { apiFetch<BrandingDto>("/branding").then(setBranding).catch(() => {}); }, []);
  const issueDate = actions.find((entry) => entry.action === "SUBMIT")?.createdAt ?? actions.at(-1)?.createdAt ?? new Date().toISOString();

  const imageAttachments = attachments.filter((attachment) => attachment.contentType.startsWith("image/"));

  // Whoever the log says raised it and settled it. The counter-signature is
  // the decision that stands, so it wins over the first-level approval.
  const requesterName = actions.find((entry) => entry.action === "SUBMIT")?.actorName ?? null;
  //
  // A refusal is a decision too: naming only approvers left a refused sheet
  // with an empty authority line, so the form showed the request as unsigned
  // instead of showing who turned it down.
  const approverName =
    actions.find((entry) => entry.action === "COUNTERSIGN_APPROVE")?.actorName ??
    actions.find((entry) => entry.action === "COUNTERSIGN_REJECT")?.actorName ??
    actions.find((entry) => entry.action === "APPROVE")?.actorName ??
    actions.find((entry) => entry.action === "REJECT")?.actorName ??
    null;

  return (
    <>
    <article className="print-page request-form-sheet legacy-request-form">
      <header className="legacy-form-header">
        <div className="legacy-form-brand">
          {branding?.logoUrl && <img src={branding.logoUrl} alt="" />}
          <div><h2>{branding?.schoolName || "مدارس الريادة النموذجية"}</h2><p>{branding?.schoolLabel || "الإدارة العامة — قسم الشؤون الإدارية والمستودعات"}</p></div>
        </div>
        <div className="legacy-form-meta">
          <TriLabel text={["رقم الطلب", "Request No.", "अनुरोध संख्या"]} /><strong className="mono">{documentNumber}</strong>
          <TriLabel text={["تاريخ الإصدار", "Issue Date", "जारी करने की तिथि"]} /><strong>{formatDate(issueDate)}</strong>
        </div>
      </header>
      <div className="legacy-form-title">
        <TriLabel text={title} />
        <TriLabel text={subtitle} />
      </div>
      <div className="legacy-form-grid">
        {cells.map((cell, index) => <div className="legacy-form-cell" key={index}><TriLabel text={cell.label} /><span className="legacy-form-value">{cell.value || "—"}</span></div>)}
      </div>
      <div className="legacy-form-status"><TriLabel text={["حالة الطلب", "Request Status", "अनुरोध की स्थिति"]} /><span className={`stamp ${statusClass}`}><span className="dot" />{status}</span></div>
      {sectionTitle && <div className="legacy-form-section"><TriLabel text={sectionTitle} /></div>}
      {children}
      {/* What actually left the store, which is not always what was
          approved -- the sheet has to show the handover, signed by whoever
          released it. */}
      {deliveryReport && deliveryReport.lines.length > 0 && <>
        <div className="legacy-form-section"><TriLabel text={["تقرير إنجاز العمل", "Work Completion Report", "कार्य पूर्णता रिपोर्ट"]} /></div>
        <table className="legacy-form-table">
          <thead><tr>
            <th>الصنف<br /><small>Item</small></th>
            <th>الكمية المسلَّمة<br /><small>Delivered</small></th>
            <th>المصدر<br /><small>Source</small></th>
          </tr></thead>
          <tbody>
            {deliveryReport.lines.map((line, index) => (
              <tr key={index}>
                <td>{line.name}</td>
                <td>{line.issued} {line.unit ?? ""}</td>
                <td>المستودع<br /><small>Warehouse</small></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="legacy-form-signatures legacy-form-signatures-single">
          <div>
            توقيع أمين المستودع<br /><small>Storekeeper signature</small>
            {deliveryReport.releasedBy && <em className="legacy-signature-name">{deliveryReport.releasedBy}</em>}
          </div>
        </div>
      </>}

      {actions.length > 0 && <>
        <div className="legacy-form-section"><TriLabel text={["سجل الإجراءات والتعليقات", "Actions & comments log", "कार्रवाई और टिप्पणियाँ"]} /></div>
        <div className="legacy-form-actions">{[...actions].reverse().map((entry, index) => <div key={`${entry.createdAt}-${index}`}><span><b>{actionLabel(entry.action)}</b> — {entry.actorName}</span><time>{new Date(entry.createdAt).toLocaleString("ar-SA")}</time>{entry.reason && <p>{entry.reason}</p>}</div>)}</div>
      </>}
      {/* Named where the log knows who acted, so the sheet says who signed
          rather than leaving anonymous boxes. There is no purchasing officer in
          this organisation, so no line pretends to wait for one. */}
      <div className="legacy-form-signatures">
        <div>
          توقيع مقدّم الطلب<br /><small>Requester signature</small>
          {requesterName && <em className="legacy-signature-name">{requesterName}</em>}
        </div>
        <div>
          توقيع جهة الاعتماد<br /><small>Approver signature</small>
          {approverName && <em className="legacy-signature-name">{approverName}</em>}
        </div>
      </div>
      <footer className="legacy-form-footer">مستند صادر آليًا من منصة سِجِلّ لإدارة المستودع والصيانة المدرسية</footer>
    </article>
    {imageAttachments.map((attachment, index) => (
      <article className="print-page legacy-attachment-page" key={attachment.id}>
        <header className="legacy-attachment-header">
          <TriLabel text={["مرفق الطلب", "Request attachment", "अनुरोध संलग्नक"]} />
          <span>{index + 1} / {imageAttachments.length}</span>
        </header>
        {/* No filename caption: a storage UUID under a photo tells the reader
            nothing and looks like a defect on a printed form. */}
        <div className="legacy-attachment-frame">
          <img src={attachment.url} alt="" />
        </div>
      </article>
    ))}
    </>
  );
}

