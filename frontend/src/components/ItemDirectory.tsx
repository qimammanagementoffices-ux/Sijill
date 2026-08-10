"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import { exportToXlsx } from "@/lib/exportXlsx";
import PrintReportHeader from "@/components/PrintReportHeader";
import SectionLoading from "@/components/SectionLoading";
import ItemForm from "@/components/ItemForm";
import Toast from "@/components/Toast";
import ItemViewModal from "@/components/ItemViewModal";
import Lightbox from "@/components/Lightbox";
import { IconSheet, IconPrinter, IconFilePdf, IconTag } from "@/components/NavIcons";
import { entityName, useEntityLocale } from "@/i18n/entityName";
import CategoriesModal from "@/components/CategoriesModal";
import type { CategoryDto, InventoryItemDetail, InventoryItemListItem, PagedResponse } from "@/lib/types";
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
  basePath,
  categoriesPath,
}: {
  dict: Dictionary["warehouseItems"];
  errorsDict: Dictionary["errors"];
  commonDict: Dictionary["common"];
  categoriesModalDict: Dictionary["categoriesModal"];
  attachmentsDict: Dictionary["attachments"];
  basePath: string;
  categoriesPath: string;
}) {
  const router = useRouter();
  const entityLocale = useEntityLocale();
  const [q, setQ] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState<PagedResponse<InventoryItemListItem> | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Which page is being fetched -- drives the spinner on the page button
  // that was clicked, rather than one shared "loading" flag.
  const [loadingPage, setLoadingPage] = useState<number | null>(null);
  const [viewItemId, setViewItemId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; filename: string } | null>(null);
  // Sorting is entirely server-side: the endpoint already takes a Pageable,
  // so ?sort=field,dir works without a backend change. Sorting the current
  // page client-side would only order the 20 rows on screen.
  // Newest entry first: what you added last is what you are most likely
  // looking for.
  const [sort, setSort] = useState<Sort>({ field: "dateAdded", dir: "desc" });
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  const filtersActive =
    filters.categoryId !== "" || filters.dateFrom !== "" || filters.dateTo !== "" || lowStockOnly || q !== "";

  function applyFilter(patch: Partial<Filters>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    load(0, q, lowStockOnly, sort, next);
  }

  function clearFilters() {
    setFilters(NO_FILTERS);
    setQ("");
    setLowStockOnly(false);
    load(0, "", false, sort, NO_FILTERS);
  }

  function toggleSort(field: string) {
    const next: Sort =
      sort.field === field ? { field, dir: sort.dir === "asc" ? "desc" : "asc" } : { field, dir: "asc" };
    setSort(next);
    load(0, q, lowStockOnly, next);
  }

  function load(
    pageNumber: number,
    query: string,
    lowStock: boolean,
    sortBy: Sort = sort,
    filterBy: Filters = filters
  ) {
    setLoadingPage(pageNumber);
    // Empty filter = omitted, not sent blank: the endpoint treats a missing
    // param as "no filter", and an empty string would fail date parsing.
    const extra =
      (filterBy.categoryId ? `&categoryId=${filterBy.categoryId}` : "") +
      (filterBy.dateFrom ? `&dateFrom=${filterBy.dateFrom}` : "") +
      (filterBy.dateTo ? `&dateTo=${filterBy.dateTo}` : "");
    apiFetch<PagedResponse<InventoryItemListItem>>(
      `${basePath}?q=${encodeURIComponent(query)}&lowStockOnly=${lowStock}&page=${pageNumber}` +
        `&sort=${sortBy.field},${sortBy.dir}${extra}`
    )
      .then(setPage)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.replace("/dashboard");
        }
      })
      .finally(() => setLoadingPage(null));
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load(0, "", false);
    apiFetch<CategoryDto[]>(categoriesPath).then(setCategories).catch(() => {});
    apiFetch<{ permissions: string[] }>("/auth/me")
      .then((me) => setCanManage(me.permissions.includes("wh.items")))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
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
    load(0, q, lowStockOnly);
    setToast(commonDict.actionSuccess);
    void item;
  }

  async function handleExport() {
    // Exports what is on screen, filters included -- exporting the whole
    // list while the view is filtered would silently hand back the wrong
    // rows. Same params as load(), minus paging.
    const extra =
      (filters.categoryId ? `&categoryId=${filters.categoryId}` : "") +
      (filters.dateFrom ? `&dateFrom=${filters.dateFrom}` : "") +
      (filters.dateTo ? `&dateTo=${filters.dateTo}` : "");
    const all = await apiFetch<PagedResponse<InventoryItemListItem>>(
      `${basePath}?q=${encodeURIComponent(q)}&lowStockOnly=${lowStockOnly}` +
        `&sort=${sort.field},${sort.dir}${extra}&size=10000`
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
        { header: dict.columnUnit, value: (i: InventoryItemListItem) => i.unit ?? "" },
        { header: dict.columnMinQuantity, value: (i: InventoryItemListItem) => i.minQuantity },
      ],
      all.content
    );
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
              placeholder={dict.searchPlaceholder}
              style={{ border: "1.5px solid var(--line)", borderRadius: 9, padding: "8px 12px", flex: 1, maxWidth: 260 }}
            />
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
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
              {dict.filterDateFrom}
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => applyFilter({ dateFrom: e.target.value })}
                style={{ border: "1.5px solid var(--line)", borderRadius: 9, padding: "7px 10px" }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
              {dict.filterDateTo}
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => applyFilter({ dateTo: e.target.value })}
                style={{ border: "1.5px solid var(--line)", borderRadius: 9, padding: "7px 10px" }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => {
                  setLowStockOnly(e.target.checked);
                  load(0, q, e.target.checked);
                }}
              />
              {dict.lowStockOnly}
            </label>
            <button type="submit" className="btn btn-outline btn-sm">
              {dict.search}
            </button>
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
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleExport}>
              <IconSheet className="ic-sm" />
              {commonDict.exportXlsx}
            </button>
            {/* Same window.print() as the print button: "PDF" here means the
                A4 print view saved as PDF, which is what the legacy app's
                export-pdf action did too. */}
            <button type="button" className="btn btn-outline btn-sm" onClick={() => window.print()}>
              <IconFilePdf className="ic-sm" />
              {commonDict.exportPdf}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => window.print()}>
              <IconPrinter className="ic-sm" />
              {commonDict.print}
            </button>
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

        {page.content.length === 0 ? (
          <div className="empty">
            <b>{dict.noResults}</b>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {/* Not sortable -- the image is an attachment, not a
                      column on the item row. */}
                  <th>{dict.columnImage}</th>
                  {(
                    [
                      ["code", dict.columnCode],
                      ["nameAr", dict.columnName],
                      ["category.nameAr", dict.columnCategory],
                      ["dateAdded", dict.columnDateAdded],
                      ["lastPurchasePrice", dict.columnLastPurchase],
                      ["quantity", dict.columnQuantity],
                      ["unit", dict.columnUnit],
                      ["minQuantity", dict.columnMinQuantity],
                    ] as const
                  ).map(([field, label]) => (
                    <th key={field}>
                      <button type="button" className="th-sort" onClick={() => toggleSort(field)}>
                        {label}
                        <span className="th-sort-arrow">
                          {sort.field === field ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                        </span>
                      </button>
                    </th>
                  ))}
                  {/* Not sortable: lowStock is computed in Java (quantity vs
                      minQuantity), not a column the database can order by. */}
                  <th>{dict.columnStatus}</th>
                </tr>
              </thead>
              <tbody>
                {page.content.map((item) => (
                  <tr key={item.id} className="clickable" onClick={() => setViewItemId(item.id)}>
                    <td>
                      {item.imageUrl ? (
                        // stopPropagation: the row itself opens the item
                        // card, and a thumbnail click means "show me this
                        // image", not "open the card behind it".
                        <img
                          src={item.imageUrl}
                          alt=""
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

        {page.totalPages > 1 && (
          <div className="panel-note no-print" style={{ display: "flex", gap: 6, paddingTop: 14 }}>
            {Array.from({ length: page.totalPages }, (_, i) => i).map((i) => (
              <button
                key={i}
                type="button"
                className={`btn btn-sm ${i === page.page ? "btn-primary" : "btn-outline"}`}
                onClick={() => load(i, q, lowStockOnly)}
                disabled={i === page.page || loadingPage !== null}
              >
                {loadingPage === i && <span className="spinner" />}
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
              {!categories ? (
                <SectionLoading />
              ) : (
                <ItemForm
                  dict={dict}
                  errorsDict={errorsDict}
                  categoriesModalDict={categoriesModalDict}
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

      {viewItemId && (
        <ItemViewModal
          itemId={viewItemId}
          dict={dict}
          attachmentsDict={attachmentsDict}
          commonDict={commonDict}
          canManage={canManage}
          onClose={() => setViewItemId(null)}
          onEdit={() => router.push(`${basePath}/${viewItemId}`)}
        />
      )}

      {lightbox && (
        <Lightbox url={lightbox.url} filename={lightbox.filename} onClose={() => setLightbox(null)} />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
