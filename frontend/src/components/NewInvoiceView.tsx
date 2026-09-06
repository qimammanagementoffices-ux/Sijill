"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiFetch, apiUpload, ApiError } from "@/lib/apiClient";
import type { AttachmentOwnerType, InventoryItemListItem, InvoiceDetail, PagedResponse, DiscountType } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";
import PendingAttachmentPicker from "@/components/PendingAttachmentPicker";

type LineDraft = {
  inventoryItemId: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
};

const ALLOWED_ATTACHMENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function localToday() {
  const today = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

function roundToHundredth(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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
  onSubmitted: (invoice: InvoiceDetail, warning?: string | null) => void;
  // When set, the submit button renders externally (via
  // <button form={formId}>) instead of inline -- used inside a modal,
  // same pattern as EmployeeForm.
  formId?: string;
  onSubmittingChange?: (submitting: boolean) => void;
  attachmentsDict?: Dictionary["attachments"];
  attachmentOwnerType?: AttachmentOwnerType;
}) {
  const [items, setItems] = useState<InventoryItemListItem[] | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(localToday);
  const [vendor, setVendor] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([
    { inventoryItemId: "", quantity: "1", unitPrice: "0", taxRate: "0" },
  ]);
  const [discountType, setDiscountType] = useState<DiscountType>("FIXED");
  const [discountValue, setDiscountValue] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    invoiceNumber?: boolean;
    vendor?: boolean;
    lines?: boolean;
    discount?: boolean;
    lineErrors?: { [index: number]: { quantity?: boolean; unitPrice?: boolean; taxRate?: boolean } };
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    apiFetch<PagedResponse<InventoryItemListItem>>(`${itemsPath}?size=100`).then((page) => setItems(page.content));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onSubmittingChange?.(submitting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitting]);

  // Dialog management: semantic HTML <dialog> showModal / close, focus trap, and return focus
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (showConfirmModal) {
      if (!dialog.open) {
        dialog.showModal();
        // Consequential dialog: focus begins on least-destructive action (Cancel)
        setTimeout(() => cancelBtnRef.current?.focus(), 0);
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
      if (triggerRef.current) {
        triggerRef.current.focus();
      }
    }
  }, [showConfirmModal]);

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines([...lines, { inventoryItemId: "", quantity: "1", unitPrice: "0", taxRate: "0" }]);
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  // Pre-tax and line tax calculation per calculation contract
  const lineCalcs = lines.map((line) => {
    const qty = Number(line.quantity);
    const price = Number(line.unitPrice);
    const tax = Number(line.taxRate);
    const validQty = !isNaN(qty) && qty > 0 ? qty : 0;
    const validPrice = !isNaN(price) && price >= 0 ? roundToHundredth(price) : 0;
    const validTax = !isNaN(tax) && tax >= 0 && tax <= 100 ? roundToHundredth(tax) : 0;
    const preTax = roundToHundredth(validQty * validPrice);
    const lineTax = roundToHundredth((preTax * validTax) / 100);
    return { preTax, lineTax };
  });

  const subtotal = roundToHundredth(lineCalcs.reduce((sum, l) => sum + l.preTax, 0));
  const taxTotal = roundToHundredth(lineCalcs.reduce((sum, l) => sum + l.lineTax, 0));
  const gross = roundToHundredth(subtotal + taxTotal);

  // Preserve entered discount value and calculate preview without negative clamping
  const parsedDiscount = Number(discountValue);
  const rawDiscount = isNaN(parsedDiscount) ? 0 : roundToHundredth(parsedDiscount);
  let computedDiscount = 0;
  if (discountType === "PERCENTAGE") {
    computedDiscount = roundToHundredth((gross * Math.max(0, Math.min(100, rawDiscount))) / 100);
  } else {
    computedDiscount = Math.max(0, rawDiscount);
  }
  const effectiveDiscount = Math.min(gross, computedDiscount);
  const finalTotal = roundToHundredth(Math.max(0, gross - effectiveDiscount));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Keep trigger element to return focus after dialog close
    triggerRef.current = (e.currentTarget.querySelector("button[type='submit']") as HTMLElement) || document.activeElement;

    if (attachmentsDict && pendingFiles.some((file) => !ALLOWED_ATTACHMENT_TYPES.has(file.type))) {
      setError(attachmentsDict.unsupportedType);
      return;
    }

    if (!invoiceNumber.trim()) {
      setFieldErrors((prev) => ({ ...prev, invoiceNumber: true }));
      setError(dict.errorInvoiceNumberRequired);
      return;
    }

    if (!vendor.trim()) {
      setFieldErrors((prev) => ({ ...prev, vendor: true }));
      setError(dict.errorVendorRequired);
      return;
    }

    const validLines = lines.filter((l) => l.inventoryItemId);
    if (validLines.length === 0) {
      setFieldErrors((prev) => ({ ...prev, lines: true }));
      setError(dict.errorAtLeastOneLine);
      return;
    }

    const newLineErrors: { [index: number]: { quantity?: boolean; unitPrice?: boolean; taxRate?: boolean } } = {};
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l || !l.inventoryItemId) continue;

      const q = Number(l.quantity);
      if (isNaN(q) || q <= 0 || !Number.isInteger(q)) {
        newLineErrors[i] = { ...newLineErrors[i], quantity: true };
        setFieldErrors({ lineErrors: newLineErrors });
        setError(dict.errorQuantityPositiveInteger);
        return;
      }

      const p = Number(l.unitPrice);
      if (isNaN(p) || p < 0) {
        newLineErrors[i] = { ...newLineErrors[i], unitPrice: true };
        setFieldErrors({ lineErrors: newLineErrors });
        setError(dict.errorPriceNonNegative);
        return;
      }

      const t = Number(l.taxRate || 0);
      if (isNaN(t) || t < 0 || t > 100) {
        newLineErrors[i] = { ...newLineErrors[i], taxRate: true };
        setFieldErrors({ lineErrors: newLineErrors });
        setError(dict.errorTaxRange);
        return;
      }
    }

    const parsedD = Number(discountValue);
    if (isNaN(parsedD) || parsedD < 0) {
      setFieldErrors((prev) => ({ ...prev, discount: true }));
      setError(dict.errorDiscountValueNonNegative);
      return;
    }

    if (discountType === "PERCENTAGE" && parsedD > 100) {
      setFieldErrors((prev) => ({ ...prev, discount: true }));
      setError(dict.errorDiscountRange);
      return;
    }

    if (discountType === "FIXED" && parsedD > gross) {
      setFieldErrors((prev) => ({ ...prev, discount: true }));
      setError(dict.errorDiscountExceedsGross);
      return;
    }

    // App-owned accessible semantic dialog replaces browser window.confirm
    setShowConfirmModal(true);
  }

  async function executePost() {
    setError(null);
    setSubmitting(true);
    try {
      const created = await apiFetch<InvoiceDetail>(basePath, {
        method: "POST",
        body: JSON.stringify({
          invoiceNumber,
          invoiceDate: invoiceDate || null,
          vendor,
          discountType,
          discountValue: Number(discountValue || 0),
          lines: lines
            .filter((l) => l.inventoryItemId)
            .map((l) => ({
              inventoryItemId: l.inventoryItemId,
              quantity: Number(l.quantity),
              unitPrice: Number(l.unitPrice),
              taxRate: Number(l.taxRate || 0),
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

      setShowConfirmModal(false);
      onSubmitted(created, uploadFailed ? dict.attachmentsFailed : null);
    } catch (err) {
      setShowConfirmModal(false);
      setError(err instanceof ApiError ? err.message : errorsDict.generic);
      setSubmitting(false);
    }
  }

  if (!items) return <SectionLoading />;

  return (
    <>
      <form id={formId} onSubmit={handleSubmit} noValidate>
        <div className="panel">
          <div className="panel-body">
            <div className="form-grid">
              <div className="field">
                <label htmlFor="invoice-number-input">{dict.numberLabel}</label>
                <input
                  id="invoice-number-input"
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => {
                    setInvoiceNumber(e.target.value);
                    if (fieldErrors.invoiceNumber) setFieldErrors((prev) => ({ ...prev, invoiceNumber: false }));
                  }}
                  placeholder={dict.numberPlaceholder}
                  aria-invalid={fieldErrors.invoiceNumber ? "true" : undefined}
                  aria-describedby={fieldErrors.invoiceNumber ? "invoice-form-error" : undefined}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="invoice-date-input">{dict.dateLabel}</label>
                <input
                  id="invoice-date-input"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="invoice-vendor-input">{dict.vendorLabel}</label>
                <input
                  id="invoice-vendor-input"
                  type="text"
                  value={vendor}
                  onChange={(e) => {
                    setVendor(e.target.value);
                    if (fieldErrors.vendor) setFieldErrors((prev) => ({ ...prev, vendor: false }));
                  }}
                  placeholder={dict.vendorPlaceholder}
                  aria-invalid={fieldErrors.vendor ? "true" : undefined}
                  aria-describedby={fieldErrors.vendor ? "invoice-form-error" : undefined}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>{dict.addLine}</h3>
          </div>
          <div className="panel-body">
            {lines.map((line, index) => {
              const lineErr = fieldErrors.lineErrors?.[index];
              return (
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
                    <label htmlFor={`invoice-item-${index}`}>{dict.itemLabel}</label>
                    <select
                      id={`invoice-item-${index}`}
                      value={line.inventoryItemId}
                      onChange={(e) => {
                        updateLine(index, { inventoryItemId: e.target.value });
                        if (fieldErrors.lines) setFieldErrors((prev) => ({ ...prev, lines: false }));
                      }}
                      aria-invalid={fieldErrors.lines && !line.inventoryItemId ? "true" : undefined}
                      aria-describedby={fieldErrors.lines ? "invoice-form-error" : undefined}
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
                    <label htmlFor={`invoice-qty-${index}`}>{dict.quantityLabel}</label>
                    <input
                      id={`invoice-qty-${index}`}
                      type="number"
                      min={1}
                      step={1}
                      value={line.quantity}
                      onChange={(e) => {
                        updateLine(index, { quantity: e.target.value });
                        if (lineErr?.quantity) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            lineErrors: { ...prev.lineErrors, [index]: { ...lineErr, quantity: false } },
                          }));
                        }
                      }}
                      aria-invalid={lineErr?.quantity ? "true" : undefined}
                      aria-describedby={lineErr?.quantity ? "invoice-form-error" : undefined}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`invoice-price-${index}`}>{dict.unitPriceLabel}</label>
                    <input
                      id={`invoice-price-${index}`}
                      type="number"
                      step="0.01"
                      min={0}
                      value={line.unitPrice}
                      onChange={(e) => {
                        updateLine(index, { unitPrice: e.target.value });
                        if (lineErr?.unitPrice) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            lineErrors: { ...prev.lineErrors, [index]: { ...lineErr, unitPrice: false } },
                          }));
                        }
                      }}
                      aria-invalid={lineErr?.unitPrice ? "true" : undefined}
                      aria-describedby={lineErr?.unitPrice ? "invoice-form-error" : undefined}
                    />
                  </div>
                  <div className="field" style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label htmlFor={`invoice-tax-${index}`}>{dict.lineTaxLabel}</label>
                      <input
                        id={`invoice-tax-${index}`}
                        type="number"
                        step="0.01"
                        min={0}
                        max={100}
                        placeholder="0"
                        value={line.taxRate}
                        onChange={(e) => {
                          updateLine(index, { taxRate: e.target.value });
                          if (lineErr?.taxRate) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              lineErrors: { ...prev.lineErrors, [index]: { ...lineErr, taxRate: false } },
                            }));
                          }
                        }}
                        aria-invalid={lineErr?.taxRate ? "true" : undefined}
                        aria-describedby={lineErr?.taxRate ? "invoice-form-error" : undefined}
                      />
                    </div>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => removeLine(index)}
                        title={dict.removeLine}
                        aria-label={dict.removeLine}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <button type="button" className="btn btn-outline btn-sm" onClick={addLine}>
              {dict.addLine}
            </button>

            {/* Discount controls placed after all rows */}
            <div className="invoice-discount-panel">
              <div className="field">
                <label htmlFor="invoice-discount-type">{dict.discountLabel}</label>
                <select
                  id="invoice-discount-type"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                >
                  <option value="FIXED">{dict.discountTypeFixed}</option>
                  <option value="PERCENTAGE">{dict.discountTypePercentage}</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="invoice-discount-value">
                  {discountType === "PERCENTAGE" ? "%" : dict.discountLabel}
                </label>
                <input
                  id="invoice-discount-value"
                  type="number"
                  step="0.01"
                  min={0}
                  max={discountType === "PERCENTAGE" ? 100 : undefined}
                  value={discountValue}
                  onChange={(e) => {
                    setDiscountValue(e.target.value);
                    if (fieldErrors.discount) setFieldErrors((prev) => ({ ...prev, discount: false }));
                  }}
                  aria-invalid={fieldErrors.discount ? "true" : undefined}
                  aria-describedby={fieldErrors.discount ? "invoice-form-error" : undefined}
                />
              </div>
            </div>

            {/* Stacked vertical calculation ledger - always shows discount row for layout stability */}
            <div className="invoice-ledger" aria-label={dict.totalsAriaLabel}>
              <div className="invoice-ledger-row">
                <span className="label">{dict.subtotalLabel}</span>
                <span className="val">
                  {subtotal.toFixed(2)} {commonDict.currency}
                </span>
              </div>
              <div className="invoice-ledger-row">
                <span className="label">{dict.taxTotalLabel}</span>
                <span className="val">
                  {taxTotal.toFixed(2)} {commonDict.currency}
                </span>
              </div>
              <div className="invoice-ledger-row">
                <span className="label">{dict.grossLabel}</span>
                <span className="val">
                  {gross.toFixed(2)} {commonDict.currency}
                </span>
              </div>
              <div className="invoice-ledger-row">
                <span className="label">
                  {dict.discountLabel} {discountType === "PERCENTAGE" ? `(${discountValue}%)` : ""}
                </span>
                <span className="val">
                  {effectiveDiscount > 0 ? `- ${effectiveDiscount.toFixed(2)}` : "- 0.00"} {commonDict.currency}
                </span>
              </div>
              <div className="invoice-ledger-divider" />
              <div className="invoice-ledger-final">
                <span className="label">{dict.finalTotalLabel}</span>
                <span className="val">
                  {finalTotal.toFixed(2)} {commonDict.currency}
                </span>
              </div>
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
          <p id="invoice-form-error" role="alert" className="form-error form-error-block">
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

      {/* App-owned genuine keyboard-safe semantic HTML <dialog> confirmation */}
      <dialog
        ref={dialogRef}
        className="modal"
        aria-labelledby="invoice-confirm-title"
        onCancel={(e) => {
          // Native Escape key handling: block if submitting, otherwise close dialog
          if (submitting) {
            e.preventDefault();
          } else {
            setShowConfirmModal(false);
          }
        }}
      >
        <div className="modal-head">
          <h3 id="invoice-confirm-title">{dict.postConfirmTitle}</h3>
          <button
            type="button"
            className="modal-close"
            onClick={() => setShowConfirmModal(false)}
            aria-label={dict.close}
            disabled={submitting}
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          <p style={{ marginTop: 0, color: "var(--ink-soft)" }}>{dict.postConfirm}</p>
          <dl className="info-grid" style={{ marginTop: 14 }}>
            <dt>{dict.numberLabel}</dt>
            <dd className="mono">{invoiceNumber}</dd>
            <dt>{dict.vendorLabel}</dt>
            <dd>{vendor}</dd>
            <dt>{dict.dateLabel}</dt>
            <dd className="mono">{invoiceDate}</dd>
            <dt>{dict.columnLineCount}</dt>
            <dd>{lines.filter((l) => l.inventoryItemId).length}</dd>
            <dt>
              <b>{dict.finalTotalLabel}</b>
            </dt>
            <dd>
              <b className="mono" style={{ color: "var(--sage)", fontSize: "15px" }}>
                {finalTotal.toFixed(2)} {commonDict.currency}
              </b>
            </dd>
          </dl>
        </div>
        <div className="modal-foot">
          <button
            ref={cancelBtnRef}
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setShowConfirmModal(false)}
            disabled={submitting}
          >
            {commonDict.cancel}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={executePost}
            disabled={submitting}
          >
            {submitting && <span className="spinner" />}
            {dict.postConfirmAction}
          </button>
        </div>
      </dialog>
    </>
  );
}
