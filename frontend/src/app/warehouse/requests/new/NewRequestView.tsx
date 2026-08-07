"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type {
  CategoryDto,
  InventoryItemListItem,
  LocalizedEntityDto,
  NeedRequestDetail,
  PagedResponse,
} from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

type LineDraft = { inventoryItemId: string; quantityRequested: string };

export default function NewRequestView({
  dict,
  errorsDict,
}: {
  dict: Dictionary["warehouseRequests"];
  errorsDict: Dictionary["errors"];
}) {
  const router = useRouter();
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
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    Promise.all([
      apiFetch<LocalizedEntityDto[]>("/departments"),
      apiFetch<CategoryDto[]>("/warehouse/categories"),
      apiFetch<PagedResponse<InventoryItemListItem>>("/warehouse/items?size=100"),
    ])
      .then(([d, c, i]) => {
        setDepartments(d);
        setCategories(c);
        setItems(i.content);
      })
      .catch(() => router.replace("/warehouse/requests"));
  }, [router]);

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines([...lines, { inventoryItemId: "", quantityRequested: "1" }]);
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
      router.push(`/warehouse/requests/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorsDict.generic);
      setSubmitting(false);
    }
  }

  if (!departments || !categories || !items) return null;

  return (
    <main style={{ maxWidth: 600, margin: "5vh auto", padding: "0 1rem" }}>
      <h1>{dict.addNew}</h1>
      <form onSubmit={handleSubmit}>
        <label>
          {dict.columnDepartment}
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">—</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nameAr} / {d.nameEn}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
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
          {dict.notesLabel}
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        {lines.map((line, index) => (
          <div key={index}>
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
            <label>
              {dict.quantityRequestedLabel}
              <input
                type="number"
                min={1}
                value={line.quantityRequested}
                onChange={(e) => updateLine(index, { quantityRequested: e.target.value })}
              />
            </label>
          </div>
        ))}
        <button type="button" onClick={addLine}>
          {dict.addLine}
        </button>

        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {dict.submit}
        </button>
      </form>
    </main>
  );
}
