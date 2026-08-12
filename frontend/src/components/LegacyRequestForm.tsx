"use client";

import { useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { BrandingDto } from "@/lib/types";

type FormCell = { label: [string, string, string]; value: ReactNode };
type FormAction = { actorName: string; action: string; reason: string | null; createdAt: string };

const actionAr: Record<string, string> = {
  SUBMIT: "تقديم الطلب", APPROVE: "اعتماد", REJECT: "رفض", POSTPONE: "تأجيل", START: "بدء العمل", FINISH: "إنهاء العمل",
};

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
}) {
  const [branding, setBranding] = useState<BrandingDto | null>(null);
  useEffect(() => { apiFetch<BrandingDto>("/branding").then(setBranding).catch(() => {}); }, []);
  const issueDate = actions.find((entry) => entry.action === "SUBMIT")?.createdAt ?? actions.at(-1)?.createdAt ?? new Date().toISOString();

  return (
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
      {actions.length > 0 && <>
        <div className="legacy-form-section"><TriLabel text={["سجل الإجراءات والتعليقات", "Actions & comments log", "कार्रवाई और टिप्पणियाँ"]} /></div>
        <div className="legacy-form-actions">{[...actions].reverse().map((entry, index) => <div key={`${entry.createdAt}-${index}`}><span><b>{actionAr[entry.action] ?? entry.action}</b> — {entry.actorName}</span><time>{new Date(entry.createdAt).toLocaleString("ar-SA")}</time>{entry.reason && <p>{entry.reason}</p>}</div>)}</div>
      </>}
      <div className="legacy-form-signatures"><div>توقيع مقدّم الطلب<br /><small>Requester signature</small></div><div>توقيع جهة الاعتماد<br /><small>Approver signature</small></div><div>توقيع المسؤول<br /><small>Officer signature</small></div></div>
      <footer className="legacy-form-footer">مستند صادر آليًا من منصة سِجِلّ لإدارة المستودع والصيانة المدرسية</footer>
    </article>
  );
}

