"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { usePermissions } from "@/lib/session";
import { getToken } from "@/lib/auth";
import { exportToXlsx } from "@/lib/exportXlsx";
import { fetchAllPaged } from "@/lib/fetchAllPaged";
import PrintReportHeader from "@/components/PrintReportHeader";
import SectionLoading from "@/components/SectionLoading";
import ItemForm from "@/components/ItemForm";
import Toast from "@/components/Toast";
import TableFooter from "@/components/TableFooter";
import TableSearch from "@/components/TableSearch";
import ItemViewModal from "@/components/ItemViewModal";
import Lightbox from "@/components/Lightbox";
import { IconTag } from "@/components/NavIcons";
import ExportButton from "@/components/ExportButton";
import { entityName, useEntityLocale } from "@/i18n/entityName";
import CategoriesModal from "@/components/CategoriesModal";
import type { CategoryDto, InventoryItemDetail, InventoryItemListItem, PagedResponse } from "@/lib/types";
import { withCount } from "@/lib/withCount";
import type { Dictionary } from "@/i18n/getDictionary";

type Sort = { field: string; dir: "asc" | "desc" };
type Filters = { categoryId: string; dateFrom: string; dateTo: string };

const NO_FILTERS: Filters = { categoryId: "", dateFrom: "", dateTo: "" };

// Shared by /warehouse/items and /maintenance/parts — same reusable
// inventory module on the backend (Domain-parameterized), same shape here.
// basePath is both the page route and the API path since they're
// identical in both domains ("/warehouse/items", "/maintenance/parts").
export default function ItemDirectory({
  dict,
  errorsDict,
  commonDict,
  categoriesModalDict,
  attachmentsDict,
  requestsDict,
  basePath,
  categoriesPath,
}: {
  dict: Dictionary["warehouseItems"];
  errorsDict: Dictionary["errors"];
  commonDict: Dictionary["common"];
  categoriesModalDict: Dictionary["categoriesModal"];
  attachmentsDict: Dictionary["attachments"];
  requestsDict: Dictionary["warehouseRequests"];
  basePath: string;
  categoriesPath: string;
}) {
  const router = useRouter();
  const entityLocale = useEntityLocale();
  const [q, setQ] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState<PagedResponse<InventoryItemListItem> | null>(null);
  // From AppShell's /auth/me, not a second call of our own.
  const canManage = usePermissions().includes("wh.items");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Which page is being fetched -- drives the spinner on the page button
  // that was clicked, rather than one shared "loading" flag.
  const [loadingPage, setLoadingPage] = useState<number | null>(null);
  const [viewItemId, setViewItemId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; filename: string } | null>(null);
  const [editItem, setEditItem] = useState<InventoryItemDetail | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  // Sorting is entirely server-side: the endpoint already takes a Pageable,
  // so ?sort=field,dir works without a backend change. Sorting the current
  // page client-side would only order the 20 rows on screen.
  // Newest entry first: what you added last is what you are most likely
  // looking for.
  const [sort, setSort] = useState<Sort>({ field: "dateAdded", dir: "desc" });
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [size, setSize] = useState(10);
  const [printRows, setPrintRows] = useState<InventoryItemListItem[] | null>(null);
  const requestSequence = useRef(0);
  const showRequestedQuantity = basePath === "/warehouse/items";

  const filtersActive =
    filters.categoryId !== "" || filters.dateFrom !== "" || filters.dateTo !== "" || lowStockOnly || appliedQuery !== "";

  function applyFilter(patch: Partial<Filters>) {
    const next = { ...filters, ...patch };
    if (patch.dateFrom && next.dateTo && patch.dateFrom > next.dateTo) next.dateTo = "";
    if (patch.dateTo && next.dateFrom && patch.dateTo < next.dateFrom) next.dateFrom = "";
    setFilters(next);
    load(0, appliedQuery, lowStockOnly, sort, next);
  }

  // Printed reports state what they are scoped to -- otherwise a filtered
  // printout is indistinguishable from the full list.
  function printFiltersSummary() {
    const category = filters.categoryId
      ? (categories ?? []).find((c) => c.id === filters.categoryId)
      : null;
    const parts = [`${dict.columnCategory}: ${category ? entityName(category, entityLocale) : dict.filterAllCategories}`];
    if (filters.dateFrom || filters.dateTo) {
      parts.push(`${dict.columnDateAdded}: ${filters.dateFrom || "—"} → ${filters.dateTo || "—"}`);
    }
    if (lowStockOnly) parts.push(dict.lowStockOnly);
    return parts.join(" · ");
  }

  function clearFilters() {
    setFilters(NO_FILTERS);
    setQ("");
    setAppliedQuery("");
    setLowStockOnly(false);
    load(0, "", false, sort, NO_FILTERS);
  }

  function toggleSort(field: string) {
    const next: Sort =
      sort.field === field ? { field, dir: sort.dir === "asc" ? "desc" : "asc" } : { field, dir: "asc" };
    setSort(next);
    load(0, appliedQuery, lowStockOnly, next);
  }

  function queryString(
    pageNumber: number,
    query: string,
    lowStock: boolean,
    sortBy: Sort,
    filterBy: Filters,
    perPage: number
  ) {
    const params = new URLSearchParams({
      q: query,
      page: String(pageNumber),
      size: String(perPage),
    });
    params.set(showRequestedQuantity ? "requestedOnly" : "lowStockOnly", String(lowStock));
    params.append("sort", `${sortBy.field},${sortBy.dir}`);
    params.append("sort", "id,asc");
    if (filterBy.categoryId) params.set("categoryId", filterBy.categoryId);
    if (filterBy.dateFrom) params.set("dateFrom", filterBy.dateFrom);
    if (filterBy.dateTo) params.set("dateTo", filterBy.dateTo);
    return `?${params.toString()}`;
  }

  function load(
    pageNumber: number,
    query: string,
    lowStock: boolean,
    sortBy: Sort = sort,
    filterBy: Filters = filters,
    perPage: number = size
  ) {
    const sequence = ++requestSequence.current;
    setLoadingPage(pageNumber);
    setLoadError(null);
    apiFetch<PagedResponse<InventoryItemListItem>>(
      `${basePath}${queryString(pageNumber, query, lowStock, sortBy, filterBy, perPage)}`
    )
      .then((nextPage) => {
        if (sequence === requestSequence.current) setPage(nextPage);
      })
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.replace("/dashboard");
          return;
        }
        if (sequence === requestSequence.current) setLoadError(errorsDict.generic);
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
    load(0, "", false);
    apiFetch<CategoryDto[]>(categoriesPath).then(setCategories).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setAppliedQuery(q);
    load(0, q, lowStockOnly);
  }

  function openAddModal() {
    setShowAddModal(true);
    if (!categories) {
      apiFetch<CategoryDto[]>(categoriesPath).then(setCategories);
    }
  }

  function handleAdded(item: InventoryItemDetail) {
    setShowAddModal(false);
    load(0, appliedQuery, lowStockOnly);
    setToast(commonDict.actionSuccess);
    void item;
  }

  async function handleExport() {
    const rows = await fetchAllPaged<InventoryItemListItem>((pageNumber) =>
      `${basePath}${queryString(pageNumber, appliedQuery, lowStockOnly, sort, filters, 100)}`
    );
    await exportToXlsx(
      dict.title,
      dict.title,
      [
        { header: dict.columnCode, value: (i: InventoryItemListItem) => i.code },
        { header: dict.columnName, value: (i: InventoryItemListItem) => i.nameAr },
        { header: dict.columnCategory, value: (i: InventoryItemListItem) => i.category?.ar ?? "" },
        { header: dict.columnDateAdded, value: (i: InventoryItemListItem) => i.dateAdded ?? "" },
        { header: dict.columnLastPurchase, value: (i: InventoryItemListItem) => i.lastPurchasePrice ?? "" },
        { header: dict.columnQuantity, value: (i: InventoryItemListItem) => i.quantity },
        ...(showRequestedQuantity
          ? [{ header: dict.columnQuantityRequested, value: (i: InventoryItemListItem) => i.quantityRequested }]
          : []),
        { header: dict.columnUnit, value: (i: InventoryItemListItem) => i.unit ?? "" },
        { header: dict.columnMinQuantity, value: (i: InventoryItemListItem) => i.minQuantity },
      ],
      rows
    );
  }

  async function handlePrint() {
    const rows = await fetchAllPaged<InventoryItemListItem>((pageNumber) =>
      `${basePath}${queryString(pageNumber, appliedQuery, lowStockOnly, sort, filters, 100)}`
    );
    setPrintRows(rows);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    window.print();
    setPrintRows(null);
  }

  if (!page) return <SectionLoading />;

  return (
    <>
      <div className="no-print">
        <div className="eyebrow">{dict.title}</div>
        <h1 className="section-title disp">{withCount(dict.title, page)}</h1>
      </div>
      <div className="print-only">
        <PrintReportHeader title={dict.reportTitle} filtersSummary={printFiltersSummary()} dict={commonDict} />
        <h2 className="ps-report-title">{dict.reportTitle}</h2>
      </div>

      <div className="panel">
        <div className="panel-head table-toolbar no-print">
          <form onSubmit={handleSearch} className="filter-row" style={{ flex: 1 }}>
            <TableSearch value={q} onChange={setQ} placeholder={dict.searchPlaceholder} label={dict.search} />
            <select
              value={filters.categoryId}
              onChange={(e) => applyFilter({ categoryId: e.target.value })}
              style={{ border: "1.5px solid var(--line)", borderRadius: 9, padding: "8px 12px" }}
            >
              <option value="">{dict.filterAllCategories}</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {entityName(c, entityLocale)}
                </option>
              ))}
            </select>
            <div className="date-range-filter" role="group" aria-label={dict.columnDateAdded}>
              <span className="date-range-label">{dict.columnDateAdded}</span>
              <label>
                {dict.filterDateFrom}
                <input
                  type="date"
                  value={filters.dateFrom}
                  max={filters.dateTo || undefined}
                  onChange={(e) => applyFilter({ dateFrom: e.target.value })}
                />
              </label>
              <label>
                {dict.filterDateTo}
                <input
                  type="date"
                  value={filters.dateTo}
                  min={filters.dateFrom || undefined}
                  onChange={(e) => applyFilter({ dateTo: e.target.value })}
                />
              </label>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => {
                  setLowStockOnly(e.target.checked);
                  load(0, appliedQuery, e.target.checked);
                }}
              />
              {dict.lowStockOnly}
            </label>
            {filtersActive && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={clearFilters}
                title={dict.filterClear}
                aria-label={dict.filterClear}
              >
                ×
              </button>
            )}
          </form>
          <div className="table-toolbar-actions">
            <ExportButton format="xlsx" label={commonDict.exportXlsx} onClick={handleExport} />
            {/* Same window.print() as the print button: "PDF" here means the
                A4 print view saved as PDF, which is what the legacy app's
                export-pdf action did too. */}
            <ExportButton format="pdf" label={commonDict.exportPdf} onClick={handlePrint} />
            {canManage && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowCategoriesModal(true)}>
                <IconTag className="ic-sm" />
                {dict.categoriesButton}
              </button>
            )}
            {canManage && (
              <button type="button" className="btn btn-primary btn-sm" onClick={openAddModal}>
                {dict.addNew}
              </button>
            )}
          </div>
        </div>

        {loadError && <p className="panel-note" role="alert">{loadError}</p>}

        {page.content.length === 0 ? (
          <div className="empty">
            <b>{dict.noResults}</b>
          </div>
        ) : (
          <div className="table-scroll table-loading-wrap">
            {loadingPage !== null && (
              <div className="table-loading-veil no-print">
                <span className="spinner spinner-lg" />
              </div>
            )}
            <table>
              <thead>
                <tr>
                  {/* Not sortable -- the image is an attachment, not a
                      column on the item row. */}
                  <th>{dict.columnImage}</th>
                  {[
                    ["code", dict.columnCode, true] as const,
                    ["nameAr", dict.columnName, true] as const,
                    ["category.nameAr", dict.columnCategory, true] as const,
                    ["dateAdded", dict.columnDateAdded, true] as const,
                    ["lastPurchasePrice", dict.columnLastPurchase, true] as const,
                    ["quantity", dict.columnQuantity, true] as const,
                    ...(showRequestedQuantity
                      ? [["quantityRequested", dict.columnQuantityRequested, false] as const]
                      : []),
                    ["unit", dict.columnUnit, true] as const,
                    ["minQuantity", dict.columnMinQuantity, true] as const,
                  ].map(([field, label, sortable]) => (
                    <th key={field}>
                      {sortable ? (
                        <button type="button" className="th-sort" onClick={() => toggleSort(field)}>
                          {label}
                          <span className="th-sort-arrow">
                            {sort.field === field ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                          </span>
                        </button>
                      ) : (
                        label
                      )}
                    </th>
                  ))}
                  {/* Not sortable: lowStock is computed in Java (quantity vs
                      minQuantity), not a column the database can order by. */}
                  <th>{dict.columnStatus}</th>
                </tr>
              </thead>
              <tbody>
                {(printRows ?? page.content).map((item) => (
                  <tr key={item.id} className="clickable" onClick={() => setViewItemId(item.id)}>
                    <td>
                      {item.imageUrl ? (
                        // stopPropagation: the row itself opens the item
                        // card, and a thumbnail click means "show me this
                        // image", not "open the card behind it".
                        <Image
                          src={item.imageUrl}
                          alt=""
                          width={38}
                          height={38}
                          className="row-thumb"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightbox({ url: item.imageUrl as string, filename: item.nameAr });
                          }}
                        />
                      ) : (
                        <span className="row-thumb row-thumb-empty" />
                      )}
                    </td>
                    <td className="mono">
                      <Link href={`${basePath}/${item.id}`}>{item.code}</Link>
                    </td>
                    <td>{item.nameAr}</td>
                    <td>{item.category ? item.category.ar : ""}</td>
                    <td className="mono">{item.dateAdded ?? "—"}</td>
                    <td className="qty-num">{item.lastPurchasePrice ?? "—"}</td>
                    <td className="qty-num">{item.quantity}</td>
                    {showRequestedQuantity && <td className="qty-num">{item.quantityRequested}</td>}
                    <td>{item.unit ?? "—"}</td>
                    <td className="qty-num">{item.minQuantity}</td>
                    <td>
                      <span className={`chip ${item.lowStock ? "s-rejected" : "s-approved"}`}>
                        <span className="chip-dot" />
                        {item.lowStock ? dict.lowStockBadge : dict.okBadge}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <TableFooter
          page={page.page}
          totalPages={page.totalPages}
          size={size}
          loadingPage={loadingPage}
          rowsPerPageLabel={commonDict.rowsPerPage}
          onPage={(i) => load(i, appliedQuery, lowStockOnly)}
          onSize={(next) => {
            setSize(next);
            load(0, appliedQuery, lowStockOnly, sort, filters, next);
          }}
        />
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
              {!categories ? (
                <SectionLoading />
              ) : (
                <ItemForm
                  dict={dict}
                  errorsDict={errorsDict}
                  categoriesModalDict={categoriesModalDict}
                  attachmentsDict={attachmentsDict}
                  mode="create"
                  categories={categories}
                  basePath={basePath}
                  onSubmitted={handleAdded}
                  formId="item-add-form"
                  onSubmittingChange={setAddSubmitting}
                />
              )}
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAddModal(false)} disabled={addSubmitting}>
                {commonDict.cancel}
              </button>
              <button
                type="submit"
                form="item-add-form"
                className="btn btn-primary btn-sm"
                disabled={addSubmitting || !categories}
              >
                {addSubmitting && <span className="spinner" />}
                {dict.submitCreate}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoriesModal && (
        <CategoriesModal
          basePath={categoriesPath}
          title={dict.categoriesTitle}
          description={dict.categoriesDescription}
          dict={categoriesModalDict}
          errorsDict={errorsDict}
          commonDict={commonDict}
          onClose={() => setShowCategoriesModal(false)}
          onChanged={() => apiFetch<CategoryDto[]>(categoriesPath).then(setCategories)}
        />
      )}

      {editItem && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal wide">
            <div className="modal-head">
              <h3>
                {dict.cardEdit} ({editItem.code})
              </h3>
              <button type="button" className="modal-close" onClick={() => setEditItem(null)} aria-label="close">
                ×
              </button>
            </div>
            <div className="modal-body">
              {!categories ? (
                <SectionLoading />
              ) : (
                <ItemForm
                  dict={dict}
                  errorsDict={errorsDict}
                  categoriesModalDict={categoriesModalDict}
                  attachmentsDict={attachmentsDict}
                  mode="edit"
                  initial={editItem}
                  categories={categories}
                  basePath={basePath}
                  onSubmitted={() => {
                    setEditItem(null);
                    load(page.page, appliedQuery, lowStockOnly);
                    setToast(commonDict.actionSuccess);
                  }}
                  formId="item-edit-form"
                  onSubmittingChange={setEditSubmitting}
                />
              )}
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setEditItem(null)}
                disabled={editSubmitting}
              >
                {commonDict.cancel}
              </button>
              <button
                type="submit"
                form="item-edit-form"
                className="btn btn-primary btn-sm"
                disabled={editSubmitting || !categories}
              >
                {editSubmitting && <span className="spinner" />}
                {dict.submitUpdate}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewItemId && (
        <ItemViewModal
          itemId={viewItemId}
          dict={dict}
          attachmentsDict={attachmentsDict}
          requestsDict={requestsDict}
          commonDict={commonDict}
          canManage={canManage}
          onClose={() => setViewItemId(null)}
          onEdit={() => {
            apiFetch<InventoryItemDetail>(`${basePath}/${viewItemId}`).then((detail) => {
              setViewItemId(null);
              setEditItem(detail);
            });
          }}
        />
      )}

      {lightbox && (
        <Lightbox
          url={lightbox.url}
          filename={lightbox.filename}
          title={attachmentsDict.viewImage}
          downloadLabel={attachmentsDict.download}
          closeLabel={commonDict.cancel}
          onClose={() => setLightbox(null)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
