"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type { InventoryItemListItem, InvoiceDetail, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";

type LineDraft = { inventoryItemId: string; quantity: string; unitPrice: string };

// Shared by warehouse and maintenance invoice-add modals. itemsPath is the
// matching domain's items endpoint ("/warehouse/items" or
// "/maintenance/parts") used to populate the line-item picker.
export default function NewInvoiceView({
  dict,
  errorsDict,
  basePath,
  itemsPath,
  onSubmitted,
  formId,
  onSubmittingChange,
}: {
  dict: Dictionary["warehouseInvoices"];
  errorsDict: Dictionary["errors"];
  basePath: string;
  itemsPath: string;
  onSubmitted: (invoice: InvoiceDetail) => void;
  // When set, the submit button renders externally (via
  // <button form={formId}>) instead of inline -- used inside a modal,
  // same pattern as EmployeeForm.
  formId?: string;
  onSubmittingChange?: (submitting: boolean) => void;
}) {
  const [items, setItems] = useState<InventoryItemListItem[] | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [vendor, setVendor] = useState("");
  const [taxRate, setTaxRate] = useState("15");
  const [lines, setLines] = useState<LineDraft[]>([{ inventoryItemId: "", quantity: "1", unitPrice: "0" }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<PagedResponse<InventoryItemListItem>>(`${itemsPath}?size=100`).then((page) => setItems(page.content));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onSubmittingChange?.(submitting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitting]);

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines([...lines, { inventoryItemId: "", quantity: "1", unitPrice: "0" }]);
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  const subtotal = lines.reduce((sum, l) => sum + Number(l.quantity || 0) * Number(l.unitPrice || 0), 0);
  const taxTotal = (subtotal * Number(taxRate || 0)) / 100;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await apiFetch<InvoiceDetail>(basePath, {
        method: "POST",
        body: JSON.stringify({
          invoiceNumber,
          invoiceDate: invoiceDate || null,
          vendor,
          taxRate: Number(taxRate),
          lines: lines
            .filter((l) => l.inventoryItemId)
            .map((l) => ({
              inventoryItemId: l.inventoryItemId,
              quantity: Number(l.quantity),
              unitPrice: Number(l.unitPrice),
            })),
        }),
      });
      onSubmitted(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorsDict.generic);
      setSubmitting(false);
    }
  }

  if (!items) return <SectionLoading />;

  return (
    <form id={formId} onSubmit={handleSubmit}>
        <div className="panel">
          <div className="panel-body">
            <div className="form-grid">
              <div className="field">
                <label>{dict.numberLabel}</label>
                <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required />
              </div>
              <div className="field">
                <label>{dict.dateLabel}</label>
                <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </div>
              <div className="field">
                <label>{dict.vendorLabel}</label>
                <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} required />
              </div>
              <div className="field">
                <label>{dict.taxRateLabel}</label>
                <input type="number" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>{dict.addLine}</h3>
          </div>
          <div className="panel-body">
            {lines.map((line, index) => (
              <div
                key={index}
                className="form-grid"
                style={{
                  marginBottom: 10,
                  alignItems: "end",
                  paddingTop: index > 0 ? 14 : 0,
                  borderTop: index > 0 ? "1px solid var(--line-soft)" : "none",
                }}
              >
                <div className="field">
                  <label>{dict.itemLabel}</label>
                  <select
                    value={line.inventoryItemId}
                    onChange={(e) => updateLine(index, { inventoryItemId: e.target.value })}
                    required
                  >
                    <option value="">—</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} — {item.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>{dict.quantityLabel}</label>
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => updateLine(index, { quantity: e.target.value })}
                  />
                </div>
                <div className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label>{dict.unitPriceLabel}</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={line.unitPrice}
                      onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
                    />
                  </div>
                  {lines.length > 1 && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeLine(index)}>
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-outline btn-sm" onClick={addLine}>
              {dict.addLine}
            </button>

            <p className="mono" style={{ marginTop: 16, fontSize: 13 }}>
              {dict.subtotalLabel}: {subtotal.toFixed(2)} — {dict.taxTotalLabel}: {taxTotal.toFixed(2)} —{" "}
              <strong>
                {dict.totalLabel}: {(subtotal + taxTotal).toFixed(2)}
              </strong>
            </p>
          </div>
        </div>

        {error && (
          <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, marginBottom: 12 }}>
            {error}
          </p>
        )}
        {!formId && (
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting && <span className="spinner" />}
            {dict.submit}
          </button>
        )}
    </form>
  );
}
