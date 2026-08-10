"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type {
  CategoryDto,
  InventoryItemListItem,
  LocalizedRef,
  NeedRequestDetail,
  PagedResponse,
  RoomDto,
} from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";

type MeData = { name: string; departments: LocalizedRef[] };
type LineDraft = { inventoryItemId: string; quantityRequested: string };

export default function NewRequestView({
  dict,
  errorsDict,
  onSubmitted,
  onSubmittingChange,
}: {
  dict: Dictionary["warehouseRequests"];
  errorsDict: Dictionary["errors"];
  onSubmitted: (request: NeedRequestDetail) => void;
  onSubmittingChange?: (submitting: boolean) => void;
}) {
  const [me, setMe] = useState<MeData | null>(null);
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);
  const [items, setItems] = useState<InventoryItemListItem[] | null>(null);
  const [rooms, setRooms] = useState<RoomDto[] | null>(null);

  const [step, setStep] = useState(1);
  const [categoryId, setCategoryId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [notes, setNotes] = useState("");
  const [customText, setCustomText] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ inventoryItemId: "", quantityRequested: "1" }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<MeData>("/auth/me"),
      apiFetch<CategoryDto[]>("/warehouse/categories"),
      apiFetch<PagedResponse<InventoryItemListItem>>("/warehouse/items?size=200"),
      apiFetch<RoomDto[]>("/rooms"),
    ]).then(([m, c, i, r]) => {
      setMe(m);
      setCategories(c);
      setItems(i.content);
      setRooms(r);
    });
  }, []);

  useEffect(() => {
    onSubmittingChange?.(submitting);
  }, [submitting, onSubmittingChange]);

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines([...lines, { inventoryItemId: "", quantityRequested: "1" }]);
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  const filteredItems = items?.filter((item) => !categoryId || item.category?.id === categoryId) ?? [];

  const departmentName = me?.departments?.[0]?.ar ?? "—";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await apiFetch<NeedRequestDetail>("/warehouse/requests", {
        method: "POST",
        body: JSON.stringify({
          departmentId: me?.departments?.[0]?.id ?? null,
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

  async function handleCustomSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await apiFetch<NeedRequestDetail>("/warehouse/requests", {
        method: "POST",
        body: JSON.stringify({
          departmentId: me?.departments?.[0]?.id ?? null,
          categoryId: categoryId || null,
          notes: customText,
          lines: [],
        }),
      });
      onSubmitted(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorsDict.generic);
      setSubmitting(false);
    }
  }

  if (!me || !categories || !items || !rooms) return <SectionLoading />;

  const stepLabels = [dict.stepDeptType, dict.stepItems, dict.stepAttachments];

  return (
    <div>
      {/* Stepper */}
      <div className="wizard-stepper">
        {stepLabels.map((label, i) => {
          const num = i + 1;
          const isDone = step > num;
          const isActive = step === num;
          return (
            <div key={num} className={`wizard-step ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}>
              <span className="wizard-step-num">{num}</span>
              <span className="wizard-step-label">{label}</span>
              {i < stepLabels.length - 1 && <span className="wizard-step-line" />}
            </div>
          );
        })}
      </div>

      {/* Step 1: Department + Category */}
      {step === 1 && (
        <div>
          <div className="form-grid" style={{ marginBottom: 20 }}>
            <div className="field">
              <label>{dict.columnDepartment}</label>
              <input type="text" value={departmentName} disabled />
            </div>
            <div className="field">
              <label>{dict.columnRequester}</label>
              <input type="text" value={me.name} disabled />
            </div>
            <div className="field span2">
              <label>{dict.roomLabel}</label>
              <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                <option value="">—</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roomNumber} — {r.nameAr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label style={{ display: "block", marginBottom: 10, fontWeight: 600, fontSize: 13 }}>
            {dict.categoryLabel}
          </label>
          <div className="category-radio-grid">
            {categories.map((cat) => (
              <label
                key={cat.id}
                className={`category-radio-card ${categoryId === cat.id ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="categoryId"
                  value={cat.id}
                  checked={categoryId === cat.id}
                  onChange={() => setCategoryId(cat.id)}
                />
                {cat.icon && <span className="category-radio-icon">{cat.icon}</span>}
                <span className="category-radio-name">{cat.nameAr}</span>
              </label>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!categoryId}
              onClick={() => setStep(2)}
            >
              {dict.nextStep}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Items + Submit */}
      {step === 2 && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
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
                  <label>{dict.itemLabel}</label>
                  <select
                    value={line.inventoryItemId}
                    onChange={(e) => updateLine(index, { inventoryItemId: e.target.value })}
                    required
                  >
                    <option value="">—</option>
                    {filteredItems.map((item) => (
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

          <div style={{ textAlign: "center", margin: "18px 0" }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setStep(3)}>
              {dict.addCustomRequest}
            </button>
          </div>

          <div className="field span2" style={{ marginBottom: 16 }}>
            <label>{dict.notesLabel}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && (
            <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, marginBottom: 12 }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !lines.some((l) => l.inventoryItemId)}>
              {submitting && <span className="spinner" />}
              {dict.submit}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setStep(1)}>
              {dict.prevStep}
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Custom / unlisted request */}
      {step === 3 && (
        <form onSubmit={handleCustomSubmit}>
          <div className="field span2" style={{ marginBottom: 20 }}>
            <textarea
              rows={5}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder={dict.customRequestPlaceholder}
              required
            />
          </div>

          {error && (
            <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, marginBottom: 12 }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !customText.trim()}>
              {submitting && <span className="spinner" />}
              {dict.submit}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setStep(2)}>
              {dict.prevStep}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
