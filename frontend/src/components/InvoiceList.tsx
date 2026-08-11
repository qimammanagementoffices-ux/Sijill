"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import { exportToXlsx } from "@/lib/exportXlsx";
import { fetchAllPaged } from "@/lib/fetchAllPaged";
import PrintReportHeader from "@/components/PrintReportHeader";
import SectionLoading from "@/components/SectionLoading";
import NewInvoiceView from "@/components/NewInvoiceView";
import Toast from "@/components/Toast";
import TableFooter from "@/components/TableFooter";
import type { InvoiceDetail, PagedResponse } from "@/lib/types";
import { IconSheet, IconFilePdf } from "@/components/NavIcons";
import type { Dictionary } from "@/i18n/getDictionary";

type Sort = { field: string; dir: "asc" | "desc" };

// Shared by /warehouse/invoices and /maintenance/invoices.
export default function InvoiceList({
  dict,
  errorsDict,
  commonDict,
  basePath,
  itemsPath,
}: {
  dict: Dictionary["warehouseInvoices"];
  errorsDict: Dictionary["errors"];
  commonDict: Dictionary["common"];
  basePath: string;
  itemsPath: string;
}) {
  const router = useRouter();
  const [page, setPage] = useState<PagedResponse<InvoiceDetail> | null>(null);
  const [canPost, setCanPost] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<InvoiceDetail | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<Sort>({ field: "invoiceDate", dir: "desc" });
  const [size, setSize] = useState(10);
  const [printRows, setPrintRows] = useState<InvoiceDetail[] | null>(null);
  const requestSequence = useRef(0);

  const filtersActive = dateFrom !== "" || dateTo !== "";

  // Built once and reused by load() and the export, so a filtered export
  // can never disagree with what is on screen.
  function queryString(next: Partial<{ from: string; to: string; sortBy: Sort; size: number; page: number }> = {}) {
    const from = next.from ?? dateFrom;
    const to = next.to ?? dateTo;
    const by = next.sortBy ?? sort;
    const perPage = next.size ?? size;
    const pageNumber = next.page ?? 0;
    const params = new URLSearchParams({ size: String(perPage), page: String(pageNumber) });
    params.append("sort", `${by.field},${by.dir}`);
    params.append("sort", "id,asc");
    if (from) params.set("dateFrom", from);
    if (to) params.set("dateTo", to);
    return `?${params.toString()}`;
  }

  function toggleSort(field: string) {
    const next: Sort =
      sort.field === field ? { field, dir: sort.dir === "asc" ? "desc" : "asc" } : { field, dir: "asc" };
    setSort(next);
    load({ sortBy: next });
  }

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    load({ from: "", to: "" });
  }

  function load(next: Partial<{ from: string; to: string; sortBy: Sort; size: number; page: number }> = {}) {
    const sequence = ++requestSequence.current;
    setLoading(true);
    apiFetch<PagedResponse<InvoiceDetail>>(basePath + queryString(next))
      .then((nextPage) => {
        if (sequence === requestSequence.current) setPage(nextPage);
      })
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.replace("/dashboard");
        }
      })
      .finally(() => {
        if (sequence === requestSequence.current) setLoading(false);
      });
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load();
    apiFetch<{ permissions: string[] }>("/auth/me")
      .then((me) => setCanPost(me.permissions.includes("wh.invoices.edit")))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleExport() {
    const rows = await fetchAllPaged<InvoiceDetail>((pageNumber) =>
      `${basePath}${queryString({ size: 100, page: pageNumber })}`
    );
    await exportToXlsx(
      dict.title,
      dict.title,
      [
        { header: dict.columnNumber, value: (i: InvoiceDetail) => i.invoiceNumber },
        { header: dict.columnDate, value: (i: InvoiceDetail) => i.invoiceDate },
        { header: dict.columnVendor, value: (i: InvoiceDetail) => i.vendor },
        { header: dict.subtotalLabel, value: (i: InvoiceDetail) => i.subtotal },
        { header: dict.taxTotalLabel, value: (i: InvoiceDetail) => i.taxTotal },
        { header: dict.columnTotal, value: (i: InvoiceDetail) => i.total },
      ],
      rows
    );
  }

  async function handlePrint() {
    const rows = await fetchAllPaged<InvoiceDetail>((pageNumber) =>
      `${basePath}${queryString({ size: 100, page: pageNumber })}`
    );
    setPrintRows(rows);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    window.print();
    setPrintRows(null);
  }

  function handleAdded(invoice: InvoiceDetail) {
    setShowAddModal(false);
    load();
    setToast(commonDict.actionSuccess);
    void invoice;
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
          <div className="filter-row" style={{ flex: 1 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
              {dict.filterDateFrom}
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  load({ from: e.target.value });
                }}
                style={{ border: "1.5px solid var(--line)", borderRadius: 9, padding: "7px 10px" }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
              {dict.filterDateTo}
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  load({ to: e.target.value });
                }}
                style={{ border: "1.5px solid var(--line)", borderRadius: 9, padding: "7px 10px" }}
              />
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
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleExport}>
              <IconSheet className="ic-sm" />
              {commonDict.exportXlsx}
            </button>
            {/* Same print path as the item list: "PDF" is the A4 print view. */}
            <button type="button" className="btn btn-outline btn-sm" onClick={() => void handlePrint()}>
              <IconFilePdf className="ic-sm" />
              {commonDict.exportPdf}
            </button>
            {canPost && (
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
          <div className="table-scroll table-loading-wrap">
            {loading && (
              <div className="table-loading-veil no-print">
                <span className="spinner spinner-lg" />
              </div>
            )}
            <table>
              <thead>
                <tr>
                  {(
                    [
                      ["invoiceNumber", dict.columnNumber],
                      ["invoiceDate", dict.columnDate],
                      ["vendor", dict.columnVendor],
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
                  {/* Line count is derived from the lines collection, not a
                      column the database can order by. */}
                  <th>{dict.columnLineCount}</th>
                  {(
                    [
                      ["subtotal", dict.subtotalLabel],
                      ["taxTotal", dict.taxTotalLabel],
                      ["total", dict.columnTotal],
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
                </tr>
              </thead>
              <tbody>
                {(printRows ?? page.content).map((invoice) => (
                  <tr key={invoice.id} className="clickable" onClick={() => setViewInvoice(invoice)}>
                    <td className="mono">{invoice.invoiceNumber}</td>
                    <td className="mono">{invoice.invoiceDate}</td>
                    <td>{invoice.vendor}</td>
                    <td className="qty-num">
                      <span className="chip">{invoice.lines.length}</span>
                    </td>
                    <td className="qty-num">
                      {invoice.subtotal} {commonDict.currency}
                    </td>
                    <td className="qty-num">
                      <span className="chip">{invoice.taxRate}%</span> {invoice.taxTotal} {commonDict.currency}
                    </td>
                    <td className="qty-num">
                      {invoice.total} {commonDict.currency}
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
          loadingPage={loading ? page.page : null}
          rowsPerPageLabel={commonDict.rowsPerPage}
          onPage={(i) => load({ page: i })}
          onSize={(next) => {
            setSize(next);
            load({ size: next });
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
              <NewInvoiceView
                dict={dict}
                errorsDict={errorsDict}
                basePath={basePath}
                itemsPath={itemsPath}
                onSubmitted={handleAdded}
                formId="invoice-add-form"
                onSubmittingChange={setAddSubmitting}
              />
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAddModal(false)} disabled={addSubmitting}>
                {commonDict.cancel}
              </button>
              <button type="submit" form="invoice-add-form" className="btn btn-primary btn-sm" disabled={addSubmitting}>
                {addSubmitting && <span className="spinner" />}
                {dict.submit}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Read-only by design: posting an invoice moves stock and sets each
          item's last purchase price, so invoices are immutable and a
          mistake is corrected with a new entry rather than an edit. */}
      {viewInvoice && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal wide">
            <div className="modal-head">
              <h3>
                {dict.cardTitle} ({viewInvoice.invoiceNumber})
              </h3>
              <button type="button" className="modal-close" onClick={() => setViewInvoice(null)} aria-label="close">
                ×
              </button>
            </div>
            <div className="modal-body">
              <dl className="info-grid">
                <dt>{dict.dateLabel}</dt>
                <dd className="mono">{viewInvoice.invoiceDate}</dd>
                <dt>{dict.vendorLabel}</dt>
                <dd>{viewInvoice.vendor}</dd>
                <dt>{dict.taxRateLabel}</dt>
                <dd>{viewInvoice.taxRate}%</dd>
              </dl>

              <div className="table-scroll" style={{ marginTop: 14 }}>
                <table>
                  <thead>
                    <tr>
                      <th>{dict.itemLabel}</th>
                      <th>{dict.quantityLabel}</th>
                      <th>{dict.unitPriceLabel}</th>
                      <th>{dict.totalLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewInvoice.lines.map((line) => (
                      <tr key={line.inventoryItemId}>
                        <td>
                          <span className="mono">{line.itemCode}</span> — {line.itemNameAr}
                        </td>
                        <td className="qty-num">{line.quantity}</td>
                        <td className="qty-num">
                          {line.unitPrice} {commonDict.currency}
                        </td>
                        <td className="qty-num">
                          {line.lineTotal} {commonDict.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <dl className="info-grid" style={{ marginTop: 14 }}>
                <dt>{dict.subtotalLabel}</dt>
                <dd>
                  {viewInvoice.subtotal} {commonDict.currency}
                </dd>
                <dt>{dict.taxTotalLabel}</dt>
                <dd>
                  {viewInvoice.taxTotal} {commonDict.currency}
                </dd>
                <dt>
                  <b>{dict.totalLabel}</b>
                </dt>
                <dd>
                  <b>
                    {viewInvoice.total} {commonDict.currency}
                  </b>
                </dd>
              </dl>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setViewInvoice(null)}>
                {commonDict.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
