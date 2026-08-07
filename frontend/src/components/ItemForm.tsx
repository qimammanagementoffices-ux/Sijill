"use client";

import { useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type { CategoryDto, InventoryItemDetail } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

type Props = {
  dict: Dictionary["warehouseItems"];
  errorsDict: Dictionary["errors"];
  mode: "create" | "edit";
  initial?: InventoryItemDetail;
  categories: CategoryDto[];
  onSubmitted: (item: InventoryItemDetail) => void;
};

export default function ItemForm({ dict, errorsDict, mode, initial, categories, onSubmitted }: Props) {
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
        const created = await apiFetch<InventoryItemDetail>("/warehouse/items", {
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
        const updated = await apiFetch<InventoryItemDetail>(`/warehouse/items/${initial.id}`, {
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
      {mode === "create" && (
        <label>
          {dict.codeLabel}
          <input type="text" value={code} onChange={(e) => setCode(e.target.value)} required />
        </label>
      )}
      <label>
        {dict.nameLabel} ({"ar"})
        <input type="text" value={nameAr} onChange={(e) => setNameAr(e.target.value)} required />
      </label>
      <label>
        {dict.nameLabel} ({"en"})
        <input type="text" value={nameEn} onChange={(e) => setNameEn(e.target.value)} required />
      </label>
      <label>
        {dict.categoryLabel}
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameAr} / {c.nameEn}
            </option>
          ))}
        </select>
      </label>
      <label>
        {dict.unitLabel}
        <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} />
      </label>
      <label>
        {dict.minQuantityLabel}
        <input
          type="number"
          min={0}
          value={minQuantity}
          onChange={(e) => setMinQuantity(e.target.value)}
          required
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>
        {mode === "create" ? dict.submitCreate : dict.submitUpdate}
      </button>
    </form>
  );
}
