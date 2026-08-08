"use client";

import { useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type {
  CategoryDto,
  InventoryItemDetail,
} from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

type Props = {
  dict: Dictionary["warehouseItems"];
  errorsDict: Dictionary["errors"];
  mode: "create" | "edit";
  initial?: InventoryItemDetail;
  categories: CategoryDto[];
  basePath: string;
  onSubmitted: (item: InventoryItemDetail) => void;
};

export default function ItemForm({ dict, errorsDict, mode, initial, categories, basePath, onSubmitted }: Props) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [nameAr, setNameAr] = useState(initial?.nameAr ?? "");
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category?.id ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [minQuantity, setMinQuantity] = useState(String(initial?.minQuantity ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "create") {
        const created = await apiFetch<InventoryItemDetail>(basePath, {
          method: "POST",
          body: JSON.stringify({
            code,
            nameAr,
            nameEn,
            categoryId: categoryId || null,
            unit: unit || null,
            weight: null,
            dateAdded: null,
            minQuantity: Number(minQuantity),
          }),
        });
        onSubmitted(created);
      } else if (initial) {
        const updated = await apiFetch<InventoryItemDetail>(`${basePath}/${initial.id}`, {
          method: "PUT",
          body: JSON.stringify({
            nameAr,
            nameEn,
            categoryId: categoryId || null,
            unit: unit || null,
            weight: initial.weight,
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
    <form onSubmit={handleSubmit}>
      <div className="panel">
        <div className="panel-body">
          <div className="form-grid">
            {mode === "create" && (
              <div className="field">
                <label>{dict.codeLabel}</label>
                <input type="text" value={code} onChange={(e) => setCode(e.target.value)} required />
              </div>
            )}
            <div className="field">
              <label>
                {dict.nameLabel} ({"ar"})
              </label>
              <input type="text" value={nameAr} onChange={(e) => setNameAr(e.target.value)} required dir="rtl" />
            </div>
            <div className="field">
              <label>
                {dict.nameLabel} ({"en"})
              </label>
              <input type="text" value={nameEn} onChange={(e) => setNameEn(e.target.value)} required />
            </div>
            <div className="field">
              <label>{dict.categoryLabel}</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr} / {c.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{dict.unitLabel}</label>
              <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
            <div className="field">
              <label>{dict.minQuantityLabel}</label>
              <input type="number" min={0} value={minQuantity} onChange={(e) => setMinQuantity(e.target.value)} required />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting && <span className="spinner" />}
        {mode === "create" ? dict.submitCreate : dict.submitUpdate}
      </button>
    </form>
  );
}
