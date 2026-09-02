"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { apiFetch, apiUpload, ApiError } from "@/lib/apiClient";
import type { AttachmentOwnerType, InventoryRequestOption, InvoiceDetail, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";
import PendingAttachmentPicker from "@/components/PendingAttachmentPicker";
import ItemPicker from "@/components/ItemPicker";

type LineDraft = { inventoryItemId: string; quantity: string; unitPrice: string };
const ALLOWED_ATTACHMENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function localToday() {
  const today = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

// Shared by warehouse and maintenance invoice-add modals. itemsPath is the
// matching domain's items endpoint ("/warehouse/items" or
// "/maintenance/parts") used to populate the line-item picker.
export default function NewInvoiceView({
  dict,
  errorsDict,
  commonDict,
  basePath,
  itemsPath,
  itemSearchPlaceholder,
  itemSearchEmptyLabel,
  onSubmitted,
  formId,
  onSubmittingChange,
  attachmentsDict,
  attachmentOwnerType,
}: {
  dict: Dictionary["warehouseInvoices"];
  errorsDict: Dictionary["errors"];
  commonDict: Dictionary["common"];
  basePath: string;
  itemsPath: string;
  itemSearchPlaceholder: string;
  itemSearchEmptyLabel: string;
  onSubmitted: (invoice: InvoiceDetail) => void;
  // When set, the submit button renders externally (via
  // <button form={formId}>) instead of inline -- used inside a modal,
  // same pattern as EmployeeForm.
  formId?: string;
  onSubmittingChange?: (submitting: boolean) => void;
  attachmentsDict?: Dictionary["attachments"];
  attachmentOwnerType?: AttachmentOwnerType;
}) {
  const [items, setItems] = useState<InventoryRequestOption[] | null>(null);
  const [knownItems, setKnownItems] = useState<Record<string, InventoryRequestOption>>({});
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemSearchError, setItemSearchError] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(localToday);
  const [vendor, setVendor] = useState("");
  const [taxRate, setTaxRate] = useState("15");
  const [lines, setLines] = useState<LineDraft[]>([{ inventoryItemId: "", quantity: "1", unitPrice: "0" }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const itemSearchAbort = useRef<AbortController | null>(null);
  const itemSearchSequence = useRef(0);

  const searchItems = useCallback((query: string) => {
    itemSearchAbort.current?.abort();
    const controller = new AbortController();
    const sequence = ++itemSearchSequence.current;
    itemSearchAbort.current = controller;
    setItemsLoading(true);
    setItemSearchError(null);

    const params = new URLSearchParams({ page: "0", size: "20" });
    params.append("sort", "code,asc");
    params.append("sort", "id,asc");
    if (query.trim()) params.set("q", query.trim());

    void apiFetch<PagedResponse<InventoryRequestOption>>(`${itemsPath}?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((page) => {
        if (sequence !== itemSearchSequence.current) return;
        setItems(page.content);
        setKnownItems((current) => {
          const next = { ...current };
          page.content.forEach((item) => {
            next[item.id] = item;
          });
          return next;
        });
      })
      .catch(() => {
        if (controller.signal.aborted || sequence !== itemSearchSequence.current) return;
        setItems((current) => current ?? []);
        setItemSearchError(errorsDict.generic);
      })
      .finally(() => {
        if (sequence === itemSearchSequence.current) setItemsLoading(false);
      });
  }, [errorsDict.generic, itemsPath]);

  useEffect(() => {
    searchItems("");
    return () => itemSearchAbort.current?.abort();
  }, [searchItems]);

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
    if (attachmentsDict && pendingFiles.some((file) => !ALLOWED_ATTACHMENT_TYPES.has(file.type))) {
      setError(attachmentsDict.unsupportedType);
      return;
    }
    // Posting an invoice moves stock and sets each item's last purchase
    // price, and invoices are immutable -- there is no edit or delete to
    // fall back on, so the warning is a hard confirm rather than a note.
    if (!window.confirm(dict.postConfirm)) return;
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
      let uploadFailed = false;
      if (attachmentOwnerType) {
        for (const file of pendingFiles) {
          try {
            const formData = new FormData();
            formData.append("ownerType", attachmentOwnerType);
            formData.append("ownerId", created.id);
            formData.append("file", file);
            await apiUpload(`/attachments?ownerType=${attachmentOwnerType}&ownerId=${created.id}`, formData);
          } catch {
            uploadFailed = true;
          }
        }
      }
      onSubmitted(created);
      if (uploadFailed) window.alert(dict.attachmentsFailed);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorsDict.generic);
      setSubmitting(false);
    }
  }

  if (!items) return <SectionLoading />;

  return (
    <form id={formId} onSubmit={handleSubmit} noValidate>
        <div className="panel">
          <div className="panel-body">
            <div className="form-grid">
              <div className="field">
                <label>{dict.numberLabel}</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder={dict.numberPlaceholder}
                  required
                />
              </div>
              <div className="field">
                <label>{dict.dateLabel}</label>
                <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </div>
              <div className="field">
                <label>{dict.vendorLabel}</label>
                <input
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder={dict.vendorPlaceholder}
                  required
                />
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
                className="form-grid invoice-line-row"
                style={{
                  marginBottom: 10,
                  alignItems: "end",
                  paddingTop: index > 0 ? 14 : 0,
                  borderTop: index > 0 ? "1px solid var(--line-soft)" : "none",
                }}
              >
                <div className="field">
                  <label>{dict.itemLabel}</label>
                  <ItemPicker
                    items={items.filter(
                      (item) =>
                        item.id === line.inventoryItemId ||
                        !lines.some(
                          (other, otherIndex) =>
                            otherIndex !== index && other.inventoryItemId === item.id
                        )
                    )}
                    value={line.inventoryItemId}
                    selectedItem={knownItems[line.inventoryItemId] ?? null}
                    placeholder={itemSearchPlaceholder}
                    ariaLabel={dict.itemLabel}
                    emptyLabel={itemSearchEmptyLabel}
                    loadingLabel={commonDict.loading}
                    errorLabel={itemSearchError}
                    clearLabel={dict.filterClear}
                    loading={itemsLoading}
                    onSearchChange={searchItems}
                    onChange={(inventoryItemId, item) => {
                      if (item) setKnownItems((current) => ({ ...current, [item.id]: item }));
                      updateLine(index, { inventoryItemId });
                    }}
                    required
                  />
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

            <div className="invoice-totals mono">
              <span>{dict.subtotalLabel}: {subtotal.toFixed(2)}</span>
              <span>{dict.taxTotalLabel}: {taxTotal.toFixed(2)}</span>
              <strong>{dict.totalLabel}: {(subtotal + taxTotal).toFixed(2)}</strong>
            </div>
          </div>
        </div>

        {attachmentOwnerType && attachmentsDict && (
          <div className="panel">
            <div className="panel-body">
              <div className="field">
                <label>{attachmentsDict.title}</label>
                <PendingAttachmentPicker
                  files={pendingFiles}
                  uploadLabel={attachmentsDict.upload}
                  emptyLabel={attachmentsDict.noAttachments}
                  hint={dict.attachmentsHint}
                  onSelect={(selected) => setPendingFiles((current) => [...current, ...selected])}
                  onRemove={(index) => setPendingFiles((current) => current.filter((_, i) => i !== index))}
                  removeLabel={attachmentsDict.delete}
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="form-error form-error-block">
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
