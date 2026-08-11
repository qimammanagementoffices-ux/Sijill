"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import { exportToXlsx } from "@/lib/exportXlsx";
import { fetchAllPaged } from "@/lib/fetchAllPaged";
import PrintReportHeader from "@/components/PrintReportHeader";
import SectionLoading from "@/components/SectionLoading";
import NewAssetView from "@/components/NewAssetView";
import Toast from "@/components/Toast";
import CategoriesModal from "@/components/CategoriesModal";
import AssetViewModal from "@/components/AssetViewModal";
import AssetEditModal from "@/components/AssetEditModal";
import TableFooter from "@/components/TableFooter";
import { entityName, useEntityLocale } from "@/i18n/entityName";
import type { AssetDetail, AssetListItem, CategoryDto, PagedResponse, RoomDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

const STATUS_CHIP_CLASS: Record<string, string> = {
  ACTIVE: "s-approved",
  MAINTENANCE: "s-pending",
  RETIRED: "s-postponed",
};

type Sort = { field: string; dir: "asc" | "desc" };

export default function AssetDirectory({
  dict,
  errorsDict,
  commonDict,
  categoriesModalDict,
  attachmentsDict,
}: {
  dict: Dictionary["assets"];
  errorsDict: Dictionary["errors"];
  commonDict: Dictionary["common"];
  categoriesModalDict: Dictionary["categoriesModal"];
  attachmentsDict: Dictionary["attachments"];
}) {
  const entityLocale = useEntityLocale();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState<Sort>({ field: "assetNumber", dir: "asc" });
  const [size, setSize] = useState(10);
  const [loadingPage, setLoadingPage] = useState<number | null>(null);
  const [printRows, setPrintRows] = useState<AssetListItem[] | null>(null);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const requestSequence = useRef(0);
  const [page, setPage] = useState<PagedResponse<AssetListItem> | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [viewAssetId, setViewAssetId] = useState<string | null>(null);
  const [editAssetId, setEditAssetId] = useState<string | null>(null);

  function queryString(pageNumber: number, query: string, categoryId: string, roomId: string, status: string, sortBy: Sort, perPage: number) {
    const params = new URLSearchParams({ page: String(pageNumber), size: String(perPage) });
    params.append("sort", `${sortBy.field},${sortBy.dir}`);
    params.append("sort", "id,asc");
    if (query) params.set("q", query);
    if (categoryId) params.set("categoryId", categoryId);
    if (roomId) params.set("roomId", roomId);
    if (status) params.set("status", status);
    return `?${params.toString()}`;
  }

  function load(pageNumber = 0, query = appliedQuery, categoryId = categoryFilter, roomId = roomFilter, status = statusFilter, sortBy = sort, perPage = size) {
    const sequence = ++requestSequence.current;
    setLoadingPage(pageNumber);
    apiFetch<PagedResponse<AssetListItem>>(`/assets${queryString(pageNumber, query, categoryId, roomId, status, sortBy, perPage)}`)
      .then((nextPage) => {
        if (sequence === requestSequence.current) setPage(nextPage);
      })
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.replace("/dashboard");
        }
      })
      .finally(() => {
        if (sequence === requestSequence.current) setLoadingPage(null);
      });
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load(0, "", "", "", "");
    apiFetch<{ permissions: string[] }>("/auth/me")
      .then((me) => setCanManage(me.permissions.includes("as.manage")))
      .catch(() => {});
    Promise.all([apiFetch<CategoryDto[]>("/assets/categories"), apiFetch<RoomDto[]>("/rooms")])
      .then(([nextCategories, nextRooms]) => {
        setCategories(nextCategories);
        setRooms(nextRooms);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setAppliedQuery(q);
    load(0, q);
  }

  function applyFilters(categoryId: string, roomId: string, status: string) {
    setCategoryFilter(categoryId);
    setRoomFilter(roomId);
    setStatusFilter(status);
    load(0, appliedQuery, categoryId, roomId, status);
  }

  function clearFilters() {
    setQ("");
    setAppliedQuery("");
    applyFilters("", "", "");
  }

  function toggleSort(field: string) {
    const next: Sort = sort.field === field
      ? { field, dir: sort.dir === "asc" ? "desc" : "asc" }
      : { field, dir: "asc" };
    setSort(next);
    load(0, appliedQuery, categoryFilter, roomFilter, statusFilter, next);
  }

  function statusLabel(status: string) {
    return {
      ACTIVE: dict.statusActive,
      MAINTENANCE: dict.statusMaintenance,
      RETIRED: dict.statusRetired,
    }[status];
  }

  async function handleExport() {
    const all = await fetchAllPaged<AssetListItem>((pageNumber) =>
      `/assets${queryString(pageNumber, appliedQuery, categoryFilter, roomFilter, statusFilter, sort, 100)}`
    );
    await exportToXlsx(
      dict.title,
      dict.title,
      [
        { header: dict.columnAssetNumber, value: (a: AssetListItem) => a.assetNumber },
        { header: dict.columnName, value: (a: AssetListItem) => a.nameAr },
        { header: dict.columnCategory, value: (a: AssetListItem) => a.category?.ar ?? "" },
        { header: dict.columnRoom, value: (a: AssetListItem) => a.room?.ar ?? "" },
        { header: dict.columnCustodian, value: (a: AssetListItem) => a.custodianName ?? "" },
        { header: dict.columnStatus, value: (a: AssetListItem) => statusLabel(a.status) ?? a.status },
      ],
      all
    );
  }

  async function handlePrint() {
    const all = await fetchAllPaged<AssetListItem>((pageNumber) =>
      `/assets${queryString(pageNumber, appliedQuery, categoryFilter, roomFilter, statusFilter, sort, 100)}`
    );
    setPrintRows(all);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    window.print();
    setPrintRows(null);
  }

  function handleAdded(asset: AssetDetail) {
    setShowAddModal(false);
    load(0);
    setToast(commonDict.actionSuccess);
    void asset;
  }

  if (!page) return <SectionLoading />;

  const assets = printRows ?? page.content;
  const filtersActive = appliedQuery !== "" || categoryFilter !== "" || roomFilter !== "" || statusFilter !== "";

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
              placeholder={dict.searchPlaceholder}
              style={{ border: "1.5px solid var(--line)", borderRadius: 9, padding: "8px 12px", flex: 1, maxWidth: 260 }}
            />
            <button type="submit" className="btn btn-outline btn-sm">
              {dict.search}
            </button>
            <select value={categoryFilter} onChange={(e) => applyFilters(e.target.value, roomFilter, statusFilter)}>
              <option value="">{dict.filterAllCategories}</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{entityName(category, entityLocale)}</option>)}
            </select>
            <select value={roomFilter} onChange={(e) => applyFilters(categoryFilter, e.target.value, statusFilter)}>
              <option value="">{dict.filterAllRooms}</option>
              {rooms.map((room) => <option key={room.id} value={room.id}>{room.roomNumber} — {entityName(room, entityLocale)}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => applyFilters(categoryFilter, roomFilter, e.target.value)}>
              <option value="">{dict.filterAllStatuses}</option>
              <option value="ACTIVE">{dict.statusActive}</option>
              <option value="MAINTENANCE">{dict.statusMaintenance}</option>
              <option value="RETIRED">{dict.statusRetired}</option>
            </select>
            {filtersActive && <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters} aria-label="clear">×</button>}
          </form>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleExport}>
              {commonDict.exportXlsx}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => void handlePrint()}>
              {commonDict.print}
            </button>
            <Link href="/assets/custody-report" className="btn btn-outline btn-sm">
              {dict.custodyReportTitle}
            </Link>
            {canManage && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowCategoriesModal(true)}>
                {dict.categoriesButton}
              </button>
            )}
            {canManage && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                {dict.addNew}
              </button>
            )}
          </div>
        </div>

        {assets.length === 0 ? (
          <div className="empty">
            <b>{dict.noResults}</b>
          </div>
        ) : (
          <div className="table-scroll table-loading-wrap">
            {loadingPage !== null && <div className="table-loading-veil no-print"><span className="spinner spinner-lg" /></div>}
            <table>
              <thead>
                <tr>
                  <th>{dict.columnImage}</th>
                  {([[
                    "assetNumber", dict.columnAssetNumber
                  ], ["nameAr", dict.columnName], ["category.nameAr", dict.columnCategory], ["room.nameAr", dict.columnRoom], ["custodian.name", dict.columnCustodian], ["status", dict.columnStatus]] as const).map(([field, label]) => (
                    <th key={field}><button type="button" className="th-sort" onClick={() => toggleSort(field)}>{label}<span className="th-sort-arrow">{sort.field === field ? (sort.dir === "asc" ? "▲" : "▼") : ""}</span></button></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id} className="clickable" onClick={() => setViewAssetId(asset.id)}>
                    <td>
                      {asset.thumbnailUrl ? (
                        <img
                          src={asset.thumbnailUrl}
                          alt=""
                          style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, display: "block" }}
                        />
                      ) : (
                        <span style={{ display: "inline-block", width: 40, height: 40, borderRadius: 6, background: "var(--paper-dim)" }} />
                      )}
                    </td>
                    <td className="mono">
                      <button type="button" className="link-btn" onClick={(e) => { e.stopPropagation(); setViewAssetId(asset.id); }}>
                        {asset.assetNumber}
                      </button>
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

        <TableFooter page={page.page} totalPages={page.totalPages} size={size} loadingPage={loadingPage}
          rowsPerPageLabel={commonDict.rowsPerPage} onPage={(pageNumber) => load(pageNumber)}
          onSize={(next) => { setSize(next); load(0, appliedQuery, categoryFilter, roomFilter, statusFilter, sort, next); }} />
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
                categoriesModalDict={categoriesModalDict}
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

      {showCategoriesModal && (
        <CategoriesModal
          basePath="/assets/categories"
          title={dict.categoriesTitle}
          description={dict.categoriesDescription}
          dict={categoriesModalDict}
          errorsDict={errorsDict}
          commonDict={commonDict}
          onClose={() => setShowCategoriesModal(false)}
          onChanged={() => {}}
        />
      )}

      {viewAssetId && (
        <AssetViewModal
          assetId={viewAssetId}
          dict={dict}
          commonDict={commonDict}
          canManage={canManage}
          onClose={() => setViewAssetId(null)}
          onEdit={() => {
            setEditAssetId(viewAssetId);
            setViewAssetId(null);
          }}
          onChanged={() => load(page?.page ?? 0)}
        />
      )}

      {editAssetId && (
        <AssetEditModal
          assetId={editAssetId}
          dict={dict}
          attachmentsDict={attachmentsDict}
          commonDict={commonDict}
          categoriesModalDict={categoriesModalDict}
          errorsDict={errorsDict}
          onClose={() => setEditAssetId(null)}
          onSaved={() => {
            setEditAssetId(null);
            load(page?.page ?? 0);
            setToast(commonDict.actionSuccess);
          }}
          onDeleted={() => {
            setEditAssetId(null);
            load(0);
            setToast(commonDict.actionSuccess);
          }}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
