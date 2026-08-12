"use client";

import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import { apiFetch, apiUpload, ApiError } from "@/lib/apiClient";
import { entityName, useEntityLocale } from "@/i18n/entityName";
import type {
  AttachmentDto,
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
  commonDict,
  errorsDict,
  onSubmitted,
  onSubmittingChange,
  onCancel,
}: {
  dict: Dictionary["warehouseRequests"];
  commonDict: Dictionary["common"];
  errorsDict: Dictionary["errors"];
  onSubmitted: (request: NeedRequestDetail) => void;
  onSubmittingChange?: (submitting: boolean) => void;
  onCancel?: () => void;
}) {
  const [me, setMe] = useState<MeData | null>(null);
  const entityLocale = useEntityLocale();
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);
  const [items, setItems] = useState<InventoryItemListItem[] | null>(null);
  const [rooms, setRooms] = useState<RoomDto[] | null>(null);

  const [step, setStep] = useState(1);
  const [departmentId, setDepartmentId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [notes, setNotes] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ inventoryItemId: "", quantityRequested: "1" }]);
  // Attachments can only be uploaded once the request exists (the upload
  // endpoint needs an ownerId), so step 3 queues Files in memory and posts
  // them right after the create call returns an id.
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      setDepartmentId(m.departments.length === 1 ? (m.departments[0]?.id ?? "") : "");
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

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length) setFiles((current) => [...current, ...picked]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const filteredItems = items?.filter((item) => !categoryId || item.category?.id === categoryId) ?? [];

  const selectedDepartment = me?.departments.find((department) => department.id === departmentId);
  const departmentName = selectedDepartment
    ? entityLocale === "en"
      ? selectedDepartment.en
      : selectedDepartment.ar
    : "—";
  const filledLines = lines.filter((l) => l.inventoryItemId);
  const hasContent = customMode ? customText.trim().length > 0 : filledLines.length > 0;

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
          roomId: roomId || null,
          notes: (customMode ? customText : notes) || null,
          lines: customMode
            ? []
            : filledLines.map((l) => ({
                inventoryItemId: l.inventoryItemId,
                quantityRequested: Number(l.quantityRequested),
              })),
        }),
      });

      // The request is already saved at this point -- a failed upload must
      // not look like a failed submit, so surface it and still close out.
      let uploadFailed = false;
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        try {
          await apiUpload<AttachmentDto>(
            `/attachments?ownerType=NEED_REQUEST&ownerId=${created.id}`,
            formData,
          );
        } catch {
          uploadFailed = true;
        }
      }
      if (uploadFailed) window.alert(dict.attachmentsFailed);

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
            <Fragment key={num}>
              {i > 0 && <span className={`wizard-step-line ${step > num ? "done" : step >= num ? "active" : ""}`} />}
              <div className={`wizard-step ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}>
                <span className="wizard-step-num">{num}</span>
                <span className="wizard-step-label">{label}</span>
              </div>
            </Fragment>
          );
        })}
      </div>

      {/* Step 1: Department + Room + Category */}
      {step === 1 && (
        <div>
          {/* Department choices come only from the signed-in employee. A
              single assignment is shown as a locked legacy-style fact;
              multiple assignments become a select in the same card. */}
          <div className="readonly-pair">
            <div className="readonly-box">
              <label className="readonly-box-label" htmlFor={me.departments.length > 1 ? "wizard-department" : undefined}>
                {dict.columnDepartment}
              </label>
              {me.departments.length > 1 ? (
                <select
                  id="wizard-department"
                  className="readonly-box-select"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                >
                  <option value="">—</option>
                  {me.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {entityLocale === "en" ? department.en : department.ar}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="readonly-box-value">{departmentName}</span>
              )}
            </div>
            <div className="readonly-box">
              <span className="readonly-box-label">{dict.columnRequester}</span>
              <span className="readonly-box-value">{me.name}</span>
            </div>
          </div>

          <div className="field" style={{ marginBottom: 22 }}>
            <label htmlFor="wizard-room">{dict.roomLabel}</label>
            <select id="wizard-room" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">—</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} — {r.nameAr}
                </option>
              ))}
            </select>
          </div>

          <label style={{ display: "block", marginBottom: 10, fontWeight: 600, fontSize: 13 }}>
            {dict.categoryLabel}
          </label>
          <div className="category-radio-grid">
            {categories.map((cat) => (
              <label key={cat.id} className={`category-radio-card ${categoryId === cat.id ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="categoryId"
                  value={cat.id}
                  checked={categoryId === cat.id}
                  onChange={() => setCategoryId(cat.id)}
                />
                {cat.icon && <span className="category-radio-icon">{cat.icon}</span>}
                <span className="category-radio-name">{entityName(cat, entityLocale)}</span>
              </label>
            ))}
          </div>

          <div className="wizard-actions">
            {onCancel && (
              <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>
                {commonDict.cancel}
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!categoryId || (me.departments.length > 1 && !departmentId)}
              onClick={() => setStep(2)}
            >
              {dict.nextStep}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Items (or a free-text custom request) */}
      {step === 2 && (
        <div>
          {!customMode && (
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
          )}

          {customMode && (
            <div className="field span2" style={{ marginBottom: 16 }}>
              <textarea
                rows={5}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder={dict.customRequestPlaceholder}
              />
            </div>
          )}

          <div style={{ textAlign: "center", margin: "18px 0" }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setCustomMode(!customMode)}>
              {customMode ? dict.backToItems : dict.addCustomRequest}
            </button>
          </div>

          {!customMode && (
            <div className="field span2" style={{ marginBottom: 16 }}>
              <label>{dict.notesLabel}</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          )}

          <div className="wizard-actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setStep(1)}>
              {dict.prevStep}
            </button>
            <button type="button" className="btn btn-primary btn-sm" disabled={!hasContent} onClick={() => setStep(3)}>
              {dict.nextStep}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Attachments + submit */}
      {step === 3 && (
        <form onSubmit={handleSubmit}>
          <p style={{ fontSize: 12.5, color: "var(--slate)", margin: "0 0 12px" }}>{dict.attachmentsHint}</p>

          {files.length === 0 && (
            <p style={{ fontSize: 12.5, color: "var(--slate)" }}>{dict.noAttachments}</p>
          )}

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, padding: "4px 0" }}
              >
                <span style={{ flex: 1 }}>{file.name}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setFiles(files.filter((_, i) => i !== index))}
                >
                  {dict.removeAttachment}
                </button>
              </li>
            ))}
          </ul>

          <div className="filebox">
            <label className="upl">
              {dict.addAttachment}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFilesSelected}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {error && (
            <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, margin: "12px 0 0" }}>
              {error}
            </p>
          )}

          <div className="wizard-actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setStep(2)} disabled={submitting}>
              {dict.prevStep}
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !hasContent}>
              {submitting && <span className="spinner" />}
              {dict.submit}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
