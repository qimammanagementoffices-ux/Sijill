"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import { exportToXlsx } from "@/lib/exportXlsx";
import { useEntityLocale } from "@/i18n/entityName";
import PrintReportHeader from "@/components/PrintReportHeader";
import SectionLoading from "@/components/SectionLoading";
import ExportButton from "@/components/ExportButton";
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
  // One panel per breakdown, same shape as every other table page: a titled
  // panel head over a scrollable table that veils itself while reloading.
  const tablePanel = (title: string, label: string, rows: CostBreakdownRow[]) => (
    <section className="panel">
      <div className="panel-head"><h3>{title}</h3></div>
      {rows.length === 0 ? (
        <div className="empty">—</div>
      ) : (
        <div className="table-scroll table-loading-wrap">
          {loading && (
            <div className="table-loading-veil no-print"><span className="spinner spinner-lg" /></div>
          )}
          <table>
            <thead>
              <tr>
                <th>{label}</th>
                <th>{dict.amount}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row.nameEn}-${i}`}>
                  <td>{name(row)}</td>
                  <td className="mono">{row.total.toFixed(2)} {commonDict.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  return <>
    <div className="no-print"><div className="eyebrow">{dict.title}</div><h1 className="section-title disp">{dict.title}</h1></div>
    <div className="print-only"><PrintReportHeader title={dict.reportTitle} dict={commonDict} /></div>
    <div className="panel">
      <div className="panel-head table-toolbar no-print">
        <form className="filter-row cost-filter-row" onSubmit={submit}>
          <div className="date-range-filter">
            <label><span>{dict.from}</span><input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></label>
            <label><span>{dict.to}</span><input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></label>
          </div>
          <button className="btn btn-outline btn-sm" type="submit">{dict.apply}</button>
        </form>
        <div className="table-toolbar-actions">
          <ExportButton format="xlsx" label={commonDict.exportXlsx} onClick={exportRows} />
          <ExportButton format="pdf" label={commonDict.exportPdf} onClick={() => window.print()} />
        </div>
      </div>
      <div className="panel-body">
        <div className="cards-row" style={{ gridTemplateColumns: "1fr" }}>
          <div className="stat-card">
            <div className="bar" style={{ background: "var(--seal)" }} />
            <div className="num mono">{data.total.toFixed(2)} {commonDict.currency}</div>
            <div className="lbl">{dict.total}</div>
          </div>
        </div>
      </div>
      <div className="panel-note">{dict.note}</div>
    </div>
    {tablePanel(dict.byDepartment, dict.department, data.byDepartment)}
    {tablePanel(dict.byRequester, dict.requester, data.byRequester)}
  </>;
}
