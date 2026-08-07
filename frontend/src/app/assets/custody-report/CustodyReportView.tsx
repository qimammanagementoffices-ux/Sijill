"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import { exportToXlsx } from "@/lib/exportXlsx";
import PrintReportHeader from "@/components/PrintReportHeader";
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

  if (!employees) return null;

  return (
    <main style={{ maxWidth: 700, margin: "5vh auto", padding: "0 1rem" }}>
      <PrintReportHeader
        title={dict.custodyReportTitle}
        filtersSummary={employeeName || undefined}
        dict={commonDict}
      />

      <select className="no-print" value={employeeId} onChange={(e) => generate(e.target.value)}>
        <option value="">—</option>
        {employees.map((emp) => (
          <option key={emp.id} value={emp.id}>
            {emp.name}
          </option>
        ))}
      </select>

      {assets && (
        <div>
          <p>
            {dict.custodyReportTotalCount}: {assets.length}
          </p>

          <table>
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

          <p style={{ marginTop: "3rem" }}>______________________</p>

          <p className="no-print">
            <button type="button" onClick={handleExport}>
              {commonDict.exportXlsx}
            </button>
            <button type="button" onClick={() => window.print()}>
              {dict.custodyReportPrint}
            </button>
          </p>
        </div>
      )}
    </main>
  );
}
