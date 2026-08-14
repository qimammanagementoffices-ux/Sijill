"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import { exportToXlsx } from "@/lib/exportXlsx";
import PrintReportHeader from "@/components/PrintReportHeader";
import SectionLoading from "@/components/SectionLoading";
import ExportButton from "@/components/ExportButton";
import type { AssetListItem, EmployeeListItem, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

export default function CustodyReportView({
  dict,
  commonDict,
}: {
  dict: Dictionary["assets"];
  commonDict: Dictionary["common"];
}) {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeListItem[] | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [assets, setAssets] = useState<AssetListItem[] | null>(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    apiFetch<PagedResponse<EmployeeListItem>>("/employees?size=200")
      .then((p) => setEmployees(p.content))
      .catch(() => router.replace("/assets"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function generate(id: string) {
    setEmployeeId(id);
    if (!id) {
      setAssets(null);
      return;
    }
    apiFetch<AssetListItem[]>(`/assets/custody-report/${id}`).then(setAssets);
  }

  const employeeName = employees?.find((e) => e.id === employeeId)?.name ?? "";

  async function handleExport() {
    if (!assets) return;
    await exportToXlsx(
      `${dict.custodyReportTitle} - ${employeeName}`,
      dict.custodyReportTitle,
      [
        { header: dict.columnAssetNumber, value: (a: AssetListItem) => a.assetNumber },
        { header: dict.columnName, value: (a: AssetListItem) => a.nameAr },
        { header: dict.columnRoom, value: (a: AssetListItem) => a.room?.ar ?? "" },
        { header: dict.columnStatus, value: (a: AssetListItem) => a.status },
      ],
      assets
    );
  }

  if (!employees) return <SectionLoading />;

  return (
    <>
      <div className="eyebrow">{dict.title}</div>
      <h1 className="section-title disp">{dict.custodyReportTitle}</h1>

      <div className="panel">
        <div className="panel-body">
          <div className="field" style={{ maxWidth: 360 }}>
            <select value={employeeId} onChange={(e) => generate(e.target.value)}>
              <option value="">—</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          {assets && (
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <span className="scale-badge">
                {dict.custodyReportTotalCount}: {assets.length}
              </span>
              <ExportButton format="xlsx" label={commonDict.exportXlsx} onClick={handleExport} />
              <ExportButton format="pdf" label={commonDict.exportPdf} onClick={() => setPreviewing(true)} />
            </div>
          )}
        </div>
      </div>

      {previewing && assets && (
        <div className="overlay">
          <div className="modal wide">
            <div className="modal-head no-print">
              <h3>{dict.custodyReportTitle}</h3>
              <button type="button" className="modal-close" onClick={() => setPreviewing(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="print-pages">
                <div className="print-page">
                  <PrintReportHeader
                    title={dict.custodyReportTitle}
                    filtersSummary={employeeName || undefined}
                    dict={commonDict}
                  />

                  <div className="ps-status-row">
                    <span className="scale-badge">
                      {dict.custodyReportTotalCount}: {assets.length}
                    </span>
                  </div>

                  <table className="ps-table">
                    <thead>
                      <tr>
                        <th>{dict.columnAssetNumber}</th>
                        <th>{dict.columnName}</th>
                        <th>{dict.columnRoom}</th>
                        <th>{dict.columnStatus}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map((asset) => (
                        <tr key={asset.id}>
                          <td>{asset.assetNumber}</td>
                          <td>{asset.nameAr}</td>
                          <td>{asset.room ? asset.room.ar : ""}</td>
                          <td>{asset.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="ps-sign-row">
                    <div className="ps-sign">
                      <div className="line" />
                      <div className="nm">{employeeName}</div>
                    </div>
                    <div className="ps-sign">
                      <div className="line" />
                      <div className="nm">{dict.custodianLabel}</div>
                    </div>
                  </div>

                  <div className="ps-footer">{commonDict.appName}</div>
                </div>
              </div>
            </div>
            <div className="modal-foot no-print">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setPreviewing(false)}>
                {commonDict.cancel}
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
                {commonDict.print}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
