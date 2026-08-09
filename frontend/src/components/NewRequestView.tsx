"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type {
  CategoryDto,
  InventoryItemListItem,
  LocalizedEntityDto,
  NeedRequestDetail,
  PagedResponse,
} from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";

type LineDraft = { inventoryItemId: string; quantityRequested: string };

export default function NewRequestView({
  dict,
  errorsDict,
  onSubmitted,
  formId,
  onSubmittingChange,
}: {
  dict: Dictionary["warehouseRequests"];
  errorsDict: Dictionary["errors"];
  onSubmitted: (request: NeedRequestDetail) => void;
  // When set, the submit button renders externally (via
  // <button form={formId}>) instead of inline -- used inside a modal,
  // same pattern as EmployeeForm.
  formId?: string;
  onSubmittingChange?: (submitting: boolean) => void;
}) {
  const [departments, setDepartments] = useState<LocalizedEntityDto[] | null>(null);
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);
  const [items, setItems] = useState<InventoryItemListItem[] | null>(null);
  const [departmentId, setDepartmentId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ inventoryItemId: "", quantityRequested: "1" }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<LocalizedEntityDto[]>("/departments"),
      apiFetch<CategoryDto[]>("/warehouse/categories"),
      apiFetch<PagedResponse<InventoryItemListItem>>("/warehouse/items?size=100"),
    ]).then(([d, c, i]) => {
      setDepartments(d);
      setCategories(c);
      setItems(i.content);
    });
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
    setLines([...lines, { inventoryItemId: "", quantityRequested: "1" }]);
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await apiFetch<NeedRequestDetail>("/warehouse/requests", {
        method: "POST",
        body: JSON.stringify({
          departmentId: departmentId || null,
          categoryId: categoryId || null,
          notes: notes || null,
          lines: lines
            .filter((l) => l.inventoryItemId)
            .map((l) => ({ inventoryItemId: l.inventoryItemId, quantityRequested: Number(l.quantityRequested) })),
        }),
      });
      onSubmitted(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorsDict.generic);
      setSubmitting(false);
    }
  }

  if (!departments || !categories || !items) return <SectionLoading />;

  return (
    <form id={formId} onSubmit={handleSubmit}>
      <div className="panel">
        <div className="panel-body">
          <div className="form-grid">
            <div className="field">
              <label>{dict.columnDepartment}</label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">—</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nameAr} / {d.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr} / {c.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <div className="field span2">
              <label>{dict.notesLabel}</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
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
              <div className="field span2">
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
              <div className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label>{dict.quantityRequestedLabel}</label>
                  <input
                    type="number"
                    min={1}
                    value={line.quantityRequested}
                    onChange={(e) => updateLine(index, { quantityRequested: e.target.value })}
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
