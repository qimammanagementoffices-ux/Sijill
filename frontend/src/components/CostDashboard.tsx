"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import { exportToXlsx } from "@/lib/exportXlsx";
import { useEntityLocale } from "@/i18n/entityName";
import PrintReportHeader from "@/components/PrintReportHeader";
import SectionLoading from "@/components/SectionLoading";
import type { CostBreakdownRow, CostDashboardDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

export default function CostDashboard({ domain, dict, commonDict }: {
  domain: "warehouse" | "maintenance";
  dict: Dictionary["costs"];
  commonDict: Dictionary["common"];
}) {
  const router = useRouter();
  const locale = useEntityLocale();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<CostDashboardDto | null>(null);
  const [loading, setLoading] = useState(false);

  function load(nextFrom = from, nextTo = to) {
    const params = new URLSearchParams({ domain });
    if (nextFrom) params.set("from", nextFrom);
    if (nextTo) params.set("to", nextTo);
    setLoading(true);
    apiFetch<CostDashboardDto>(`/costs?${params.toString()}`)
      .then(setData)
      .catch((error) => {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) router.replace("/dashboard");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    load("", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, domain]);

  function name(row: CostBreakdownRow) {
    return locale === "ar" ? row.nameAr : row.nameEn;
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    load();
  }

  async function exportRows() {
    const rows = [
      ...data!.byDepartment.map((row) => ({ group: dict.byDepartment, name: name(row), total: row.total })),
      ...data!.byRequester.map((row) => ({ group: dict.byRequester, name: name(row), total: row.total })),
    ];
    await exportToXlsx(dict.reportTitle, dict.reportTitle, [
      { header: dict.title, value: (row) => row.group },
      { header: dict.department, value: (row) => row.name },
      { header: dict.amount, value: (row) => row.total },
    ], rows);
  }

  if (!data) return <SectionLoading />;
  const table = (title: string, label: string, rows: CostBreakdownRow[]) => (
    <section>
      <h3 className="ps-section-title">{title}</h3>
      {rows.length === 0 ? <div className="empty">—</div> : <div className="table-scroll"><table><thead><tr><th>{label}</th><th>{dict.amount}</th></tr></thead><tbody>{rows.map((row, i) => <tr key={`${row.nameEn}-${i}`}><td>{name(row)}</td><td className="mono">{row.total.toFixed(2)} {commonDict.currency}</td></tr>)}</tbody></table></div>}
    </section>
  );

  return <>
    <div className="no-print"><div className="eyebrow">{dict.title}</div><h1 className="section-title disp">{dict.title}</h1></div>
    <div className="print-only"><PrintReportHeader title={dict.reportTitle} dict={commonDict} /></div>
    <div className="panel">
      <div className="panel-head no-print">
        <form className="filter-row" onSubmit={submit}>
          <label>{dict.from}<input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>{dict.to}<input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></label>
          <button className="btn btn-outline btn-sm" type="submit">{dict.apply}</button>
          {loading && <span className="spinner" />}
        </form>
        <div style={{ display: "flex", gap: 8 }}><button className="btn btn-outline btn-sm" type="button" onClick={() => void exportRows()}>{commonDict.exportXlsx}</button><button className="btn btn-outline btn-sm" type="button" onClick={() => window.print()}>{commonDict.print}</button></div>
      </div>
      <div className="panel-body">
        <div className="cards-row" style={{ gridTemplateColumns: "1fr", marginBottom: 16 }}><div className="stat-card"><div className="bar" style={{ background: "var(--seal)" }} /><div className="num mono">{data.total.toFixed(2)} {commonDict.currency}</div><div className="lbl">{dict.total}</div></div></div>
        <div className="form-grid">{table(dict.byDepartment, dict.department, data.byDepartment)}{table(dict.byRequester, dict.requester, data.byRequester)}</div>
      </div>
      <div className="panel-note">{dict.note}</div>
    </div>
  </>;
}
