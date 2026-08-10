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
import CategoriesModal from "@/components/CategoriesModal";
import type { CategoryDto, InventoryItemDetail, InventoryItemListItem, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

// Shared by /warehouse/items and /maintenance/parts — same reusable
// inventory module on the backend (Domain-parameterized), same shape here.
// basePath is both the page route and the API path since they're
// identical in both domains ("/warehouse/items", "/maintenance/parts").
export default function ItemDirectory({
  dict,
  errorsDict,
  commonDict,
  categoriesModalDict,
  basePath,
  categoriesPath,
}: {
  dict: Dictionary["warehouseItems"];
  errorsDict: Dictionary["errors"];
  commonDict: Dictionary["common"];
  categoriesModalDict: Dictionary["categoriesModal"];
  basePath: string;
  categoriesPath: string;
}) {
  const router = useRouter();
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

  function load(pageNumber: number, query: string, lowStock: boolean) {
    setLoadingPage(pageNumber);
    apiFetch<PagedResponse<InventoryItemListItem>>(
      `${basePath}?q=${encodeURIComponent(query)}&lowStockOnly=${lowStock}&page=${pageNumber}`
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
    const all = await apiFetch<PagedResponse<InventoryItemListItem>>(
      `${basePath}?q=${encodeURIComponent(q)}&lowStockOnly=${lowStockOnly}&size=10000`
    );
    await exportToXlsx(
      dict.title,
      dict.title,
      [
        { header: dict.columnCode, value: (i: InventoryItemListItem) => i.code },
        { header: dict.columnName, value: (i: InventoryItemListItem) => i.nameAr },
        { header: dict.columnCategory, value: (i: InventoryItemListItem) => i.category?.ar ?? "" },
        { header: dict.columnQuantity, value: (i: InventoryItemListItem) => i.quantity },
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
          </form>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleExport}>
              {commonDict.exportXlsx}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => window.print()}>
              {commonDict.print}
            </button>
            {canManage && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowCategoriesModal(true)}>
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
                  <th>{dict.columnCode}</th>
                  <th>{dict.columnName}</th>
                  <th>{dict.columnCategory}</th>
                  <th>{dict.columnDateAdded}</th>
                  <th>{dict.columnLastPurchase}</th>
                  <th>{dict.columnQuantity}</th>
                  <th>{dict.columnUnit}</th>
                  <th>{dict.columnMinQuantity}</th>
                  <th>{dict.columnStatus}</th>
                </tr>
              </thead>
              <tbody>
                {page.content.map((item) => (
                  <tr key={item.id} className="clickable" onClick={() => router.push(`${basePath}/${item.id}`)}>
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

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
