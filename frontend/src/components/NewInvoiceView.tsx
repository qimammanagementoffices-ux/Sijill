"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { InventoryItemListItem, InvoiceDetail, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

type LineDraft = { inventoryItemId: string; quantity: string; unitPrice: string };

// Shared by /warehouse/invoices/new and /maintenance/invoices/new.
// itemsPath is the matching domain's items endpoint ("/warehouse/items" or
// "/maintenance/parts") used to populate the line-item picker.
export default function NewInvoiceView({
  dict,
  errorsDict,
  basePath,
  itemsPath,
}: {
  dict: Dictionary["warehouseInvoices"];
  errorsDict: Dictionary["errors"];
  basePath: string;
  itemsPath: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItemListItem[] | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [vendor, setVendor] = useState("");
  const [taxRate, setTaxRate] = useState("15");
  const [lines, setLines] = useState<LineDraft[]>([{ inventoryItemId: "", quantity: "1", unitPrice: "0" }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    apiFetch<PagedResponse<InventoryItemListItem>>(`${itemsPath}?size=100`)
      .then((page) => setItems(page.content))
      .catch(() => router.replace(basePath));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

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
      router.push(`${basePath}?posted=${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorsDict.generic);
      setSubmitting(false);
    }
  }

  if (!items) return null;

  return (
    <main style={{ maxWidth: 700, margin: "5vh auto", padding: "0 1rem" }}>
      <h1>{dict.addNew}</h1>
      <form onSubmit={handleSubmit}>
        <label>
          {dict.numberLabel}
          <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required />
        </label>
        <label>
          {dict.dateLabel}
          <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
        </label>
        <label>
          {dict.vendorLabel}
          <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} required />
        </label>
        <label>
          {dict.taxRateLabel}
          <input type="number" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
        </label>

        {lines.map((line, index) => (
          <div key={index}>
            <label>
              {dict.itemLabel}
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
            </label>
            <label>
              {dict.quantityLabel}
              <input
                type="number"
                min={1}
                value={line.quantity}
                onChange={(e) => updateLine(index, { quantity: e.target.value })}
              />
            </label>
            <label>
              {dict.unitPriceLabel}
              <input
                type="number"
                step="0.01"
                min={0}
                value={line.unitPrice}
                onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
              />
            </label>
            {lines.length > 1 && (
              <button type="button" onClick={() => removeLine(index)}>
                ×
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addLine}>
          {dict.addLine}
        </button>

        <p>
          {dict.subtotalLabel}: {subtotal.toFixed(2)} — {dict.taxTotalLabel}: {taxTotal.toFixed(2)} —{" "}
          {dict.totalLabel}: {(subtotal + taxTotal).toFixed(2)}
        </p>

        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {dict.submit}
        </button>
      </form>
    </main>
  );
}
