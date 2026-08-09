"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import { exportToXlsx } from "@/lib/exportXlsx";
import PrintReportHeader from "@/components/PrintReportHeader";
import SectionLoading from "@/components/SectionLoading";
import NewAssetView from "@/components/NewAssetView";
import Toast from "@/components/Toast";
import type { AssetDetail, AssetListItem, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

const STATUS_CHIP_CLASS: Record<string, string> = {
  ACTIVE: "s-approved",
  MAINTENANCE: "s-pending",
  RETIRED: "s-postponed",
};

export default function AssetDirectory({
  dict,
  errorsDict,
  commonDict,
}: {
  dict: Dictionary["assets"];
  errorsDict: Dictionary["errors"];
  commonDict: Dictionary["common"];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [page, setPage] = useState<PagedResponse<AssetListItem> | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function load(pageNumber: number, query: string) {
    apiFetch<PagedResponse<AssetListItem>>(`/assets?q=${encodeURIComponent(query)}&page=${pageNumber}`)
      .then(setPage)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.replace("/dashboard");
        }
      });
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load(0, "");
    apiFetch<{ permissions: string[] }>("/auth/me")
      .then((me) => setCanManage(me.permissions.includes("as.manage")))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    load(0, q);
  }

  function statusLabel(status: string) {
    return {
      ACTIVE: dict.statusActive,
      MAINTENANCE: dict.statusMaintenance,
      RETIRED: dict.statusRetired,
    }[status];
  }

  async function handleExport() {
    const all = await apiFetch<PagedResponse<AssetListItem>>(`/assets?q=${encodeURIComponent(q)}&size=10000`);
    await exportToXlsx(
      dict.title,
      dict.title,
      [
        { header: dict.columnAssetNumber, value: (a: AssetListItem) => a.assetNumber },
        { header: dict.columnName, value: (a: AssetListItem) => a.nameAr },
        { header: dict.columnCategory, value: (a: AssetListItem) => a.category?.ar ?? "" },
        { header: dict.columnRoom, value: (a: AssetListItem) => a.room?.ar ?? "" },
        { header: dict.columnCustodian, value: (a: AssetListItem) => a.custodianName ?? "" },
        { header: dict.columnStatus, value: (a: AssetListItem) => a.status },
      ],
      all.content
    );
  }

  function handleAdded(asset: AssetDetail) {
    setShowAddModal(false);
    load(0, q);
    setToast(commonDict.actionSuccess);
    void asset;
  }

  if (!page) return <SectionLoading />;

  return (
    <>
      <div className="no-print">
        <div className="eyebrow">{dict.title}</div>
        <h1 className="section-title disp">{dict.title}</h1>
      </div>
      <div className="print-only">
        <PrintReportHeader title={dict.title} dict={commonDict} />
      </div>

      <div className="panel">
        <div className="panel-head no-print">
          <form onSubmit={handleSearch} className="filter-row" style={{ flex: 1 }}>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ border: "1.5px solid var(--line)", borderRadius: 9, padding: "8px 12px", flex: 1, maxWidth: 260 }}
            />
            <button type="submit" className="btn btn-outline btn-sm">
              {dict.title}
            </button>
          </form>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleExport}>
              {commonDict.exportXlsx}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => window.print()}>
              {commonDict.print}
            </button>
            <Link href="/assets/custody-report" className="btn btn-outline btn-sm">
              {dict.custodyReportTitle}
            </Link>
            {canManage && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                {dict.addNew}
              </button>
            )}
          </div>
        </div>

        {page.content.length === 0 ? (
          <div className="empty">
            <b>{dict.noResults}</b>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{dict.columnAssetNumber}</th>
                  <th>{dict.columnName}</th>
                  <th>{dict.columnCategory}</th>
                  <th>{dict.columnRoom}</th>
                  <th>{dict.columnCustodian}</th>
                  <th>{dict.columnStatus}</th>
                </tr>
              </thead>
              <tbody>
                {page.content.map((asset) => (
                  <tr key={asset.id} className="clickable" onClick={() => router.push(`/assets/${asset.id}`)}>
                    <td className="mono">
                      <Link href={`/assets/${asset.id}`}>{asset.assetNumber}</Link>
                    </td>
                    <td>{asset.nameAr}</td>
                    <td>{asset.category ? asset.category.ar : ""}</td>
                    <td>{asset.room ? asset.room.ar : ""}</td>
                    <td>{asset.custodianName ?? ""}</td>
                    <td>
                      <span className={`chip ${STATUS_CHIP_CLASS[asset.status] ?? ""}`}>
                        <span className="chip-dot" />
                        {statusLabel(asset.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {page.totalPages > 1 && (
          <div className="panel-note no-print" style={{ display: "flex", gap: 6, paddingTop: 14 }}>
            {Array.from({ length: page.totalPages }, (_, i) => i).map((i) => (
              <button
                key={i}
                type="button"
                className={`btn btn-sm ${i === page.page ? "btn-primary" : "btn-outline"}`}
                onClick={() => load(i, q)}
                disabled={i === page.page}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal wide">
            <div className="modal-head">
              <h3>{dict.addNew}</h3>
              <button type="button" className="modal-close" onClick={() => setShowAddModal(false)} aria-label="close">
                ×
              </button>
            </div>
            <div className="modal-body">
              <NewAssetView
                dict={dict}
                errorsDict={errorsDict}
                onSubmitted={handleAdded}
                formId="asset-add-form"
                onSubmittingChange={setAddSubmitting}
              />
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAddModal(false)} disabled={addSubmitting}>
                {commonDict.cancel}
              </button>
              <button type="submit" form="asset-add-form" className="btn btn-primary btn-sm" disabled={addSubmitting}>
                {addSubmitting && <span className="spinner" />}
                {dict.submitCreate}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
