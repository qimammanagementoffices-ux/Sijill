"use client";

import { entityName, useEntityLocale } from "@/i18n/entityName";
import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, apiUpload, ApiError } from "@/lib/apiClient";
import TrilingualNameFields from "@/components/TrilingualNameFields";
import type {
  CategoryDto,
  InventoryItemDetail,
} from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

type Props = {
  dict: Dictionary["warehouseItems"];
  errorsDict: Dictionary["errors"];
  categoriesModalDict: Dictionary["categoriesModal"];
  mode: "create" | "edit";
  initial?: InventoryItemDetail;
  categories: CategoryDto[];
  basePath: string;
  onSubmitted: (item: InventoryItemDetail) => void;
  // When set, the submit/cancel buttons render externally (via
  // <button form={formId}>) instead of inline -- used inside a modal,
  // same pattern as EmployeeForm.
  formId?: string;
  onSubmittingChange?: (submitting: boolean) => void;
};

export default function ItemForm({
  dict,
  errorsDict,
  categoriesModalDict,
  mode,
  initial,
  categories,
  basePath,
  onSubmitted,
  formId,
  onSubmittingChange,
}: Props) {
  const entityLocale = useEntityLocale();
  // No code field: the server assigns WH-/MN- codes from a sequence on
  // create, and they were already immutable on update.
  const [nameAr, setNameAr] = useState(initial?.nameAr ?? "");
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? "");
  const [nameHi, setNameHi] = useState(initial?.nameHi ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category?.id ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [weight, setWeight] = useState(initial?.weight != null ? String(initial.weight) : "");
  const [minQuantity, setMinQuantity] = useState(String(initial?.minQuantity ?? 0));
  // Create-only: stock moves through invoices and issues after this, and
  // the update endpoint takes neither field.
  const [quantity, setQuantity] = useState("0");
  const [dateAdded, setDateAdded] = useState(() => new Date().toISOString().slice(0, 10));
  // Attachments need an owner id, which does not exist until the item is
  // created -- so they are held here and uploaded right after the POST.
  // In edit mode AttachmentUploader handles them directly (ItemEditView).
  const [images, setImages] = useState<File[]>([]);
  const [pdf, setPdf] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    onSubmittingChange?.(submitting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitting]);

  // The item itself is already saved by the time this runs, so an upload
  // failure must not read as "creating the item failed" -- it is reported
  // and the caller still gets the created item.
  async function uploadAttachments(itemId: string) {
    const files = [...images, ...(pdf ? [pdf] : [])];
    for (const file of files) {
      const formData = new FormData();
      formData.append("ownerType", "INVENTORY_ITEM");
      formData.append("ownerId", itemId);
      formData.append("file", file);
      try {
        await apiUpload(`/attachments?ownerType=INVENTORY_ITEM&ownerId=${itemId}`, formData);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : errorsDict.generic);
      }
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "create") {
        const created = await apiFetch<InventoryItemDetail>(basePath, {
          method: "POST",
          body: JSON.stringify({
            nameAr,
            nameEn,
            nameHi: nameHi || null,
            categoryId: categoryId || null,
            unit: unit || null,
            weight: weight.trim() ? Number(weight) : null,
            dateAdded,
            minQuantity: Number(minQuantity),
            quantity: Number(quantity),
          }),
        });
        await uploadAttachments(created.id);
        onSubmitted(created);
      } else if (initial) {
        const updated = await apiFetch<InventoryItemDetail>(`${basePath}/${initial.id}`, {
          method: "PUT",
          body: JSON.stringify({
            nameAr,
            nameEn,
            nameHi: nameHi || null,
            categoryId: categoryId || null,
            unit: unit || null,
            weight: weight.trim() ? Number(weight) : null,
            minQuantity: Number(minQuantity),
            version: initial.version,
          }),
        });
        onSubmitted(updated);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorsDict.generic);
      setSubmitting(false);
    }
  }

  return (
    <form id={formId} onSubmit={handleSubmit}>
      <div className="panel">
        <div className="panel-body">
          <div className="form-grid">
            <TrilingualNameFields
              nameAr={nameAr}
              setNameAr={setNameAr}
              nameEn={nameEn}
              setNameEn={setNameEn}
              nameHi={nameHi}
              setNameHi={setNameHi}
              dict={categoriesModalDict}
              errorsDict={errorsDict}
              placeholder={dict.namePlaceholder}
            />
            <div className="field">
              <label>{dict.categoryLabel}</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {entityName(c, entityLocale)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{dict.unitLabel}</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder={dict.unitPlaceholder}
              />
            </div>
            <div className="field">
              <label>
                {dict.weightLabel} <span className="panel-note">{dict.weightOptional}</span>
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={dict.weightPlaceholder}
              />
            </div>
            {mode === "create" && (
              <div className="field">
                <label>{dict.dateAddedLabel}</label>
                <input type="date" value={dateAdded} onChange={(e) => setDateAdded(e.target.value)} required />
              </div>
            )}
            {mode === "create" && (
              <div className="field">
                <label>{dict.initialQuantityLabel}</label>
                <input type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
              </div>
            )}
            <div className="field">
              <label>{dict.minQuantityLabel}</label>
              <input type="number" min={0} value={minQuantity} onChange={(e) => setMinQuantity(e.target.value)} required />
            </div>
            {mode === "create" && (
              <>
                <div className="field span2">
                  <label>{dict.imagesLabel}</label>
                  <div className="filebox">
                    <label className="upl">
                      {dict.uploadImages}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        // Appends rather than replaces: picking a second
                        // time is how you add another image, not how you
                        // start over -- removal has its own button.
                        onChange={(e) => {
                          setImages((prev) => [...prev, ...Array.from(e.target.files ?? [])]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {images.length === 0 && <span>{dict.noImagesChosen}</span>}
                    {images.map((file, i) => (
                      <span key={`${file.name}-${i}`} className="chip" style={{ gap: 8 }}>
                        {file.name}
                        <button
                          type="button"
                          aria-label="remove"
                          onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                          style={{ border: "none", background: "none", cursor: "pointer", color: "var(--seal)", fontWeight: 700 }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="field span2">
                  <label>{dict.pdfLabel}</label>
                  <div className="filebox">
                    <label className="upl">
                      {dict.uploadPdf}
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => {
                          setPdf(e.target.files?.[0] ?? null);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {pdf ? (
                      <span className="chip" style={{ gap: 8 }}>
                        {pdf.name}
                        <button
                          type="button"
                          aria-label="remove"
                          onClick={() => setPdf(null)}
                          style={{ border: "none", background: "none", cursor: "pointer", color: "var(--seal)", fontWeight: 700 }}
                        >
                          ×
                        </button>
                      </span>
                    ) : (
                      <span>{dict.noPdfChosen}</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
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
          {mode === "create" ? dict.submitCreate : dict.submitUpdate}
        </button>
      )}
    </form>
  );
}
