"use client";

import { Fragment, useEffect, useState, type FormEvent } from "react";
import { apiFetch, apiUpload, ApiError } from "@/lib/apiClient";
import { entityName, useEntityLocale } from "@/i18n/entityName";
import type {
  AttachmentDto,
  CategoryDto,
  InventoryItemListItem,
  LocalizedEntityDto,
  LocalizedRef,
  NeedRequestDetail,
  PagedResponse,
  RoomDto,
} from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";
import ItemPicker from "@/components/ItemPicker";
import DepartmentHierarchyPicker, { flattenDepartmentHierarchy } from "@/components/DepartmentHierarchyPicker";
import PendingAttachmentPicker from "@/components/PendingAttachmentPicker";

type MeData = { departments: LocalizedRef[] };
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
  const [departments, setDepartments] = useState<LocalizedEntityDto[] | null>(null);
  const [assignedDepartmentIds, setAssignedDepartmentIds] = useState<Set<string> | null>(null);

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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<MeData>("/auth/me"),
      apiFetch<LocalizedEntityDto[]>("/departments"),
      apiFetch<CategoryDto[]>("/warehouse/categories"),
      apiFetch<PagedResponse<InventoryItemListItem>>("/warehouse/items?size=200"),
      apiFetch<RoomDto[]>("/rooms"),
    ]).then(([m, departmentRows, c, i, r]) => {
      const assignedIds = new Set(m.departments.map((department) => department.id));
      setMe(m);
      setDepartments(departmentRows);
      setAssignedDepartmentIds(assignedIds);
      setDepartmentId(assignedIds.size === 1 ? assignedIds.values().next().value ?? "" : "");
      setCategories(c);
      setItems(i.content);
      setRooms(r);
    });
  }, [entityLocale]);

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

  function handleFilesSelected(picked: File[]) {
    if (picked.length) setFiles((current) => [...current, ...picked]);
  }

  const filteredItems = items?.filter((item) => !categoryId || item.category?.id === categoryId) ?? [];

  const filledLines = lines.filter((l) => l.inventoryItemId);
  const hasContent = customMode ? customText.trim().length > 0 : filledLines.length > 0;
  // Reaching the attachments step is not the same as being ready to send.
  // Someone describing an item the warehouse does not stock often wants to
  // attach a photo first and write the description with it in front of them,
  // so the step is open; the submit still asks for a description.
  const canProceed = customMode || filledLines.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    // Says why rather than leaving a dead button: the attachments step is
    // reachable with nothing written, so this is where the description is
    // asked for.
    if (!hasContent) {
      setError(dict.describeCustomRequest);
      return;
    }
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

  if (!me || !departments || !assignedDepartmentIds || !categories || !items || !rooms) return <SectionLoading />;

  const departmentOptions = flattenDepartmentHierarchy(departments, entityLocale)
    .filter(({ item }) => assignedDepartmentIds.has(item.id));
  const departmentName = departmentOptions.find(({ item }) => item.id === departmentId)?.path ?? "—";
  const excludedDepartmentIds = new Set(
    departments.filter((department) => !assignedDepartmentIds.has(department.id)).map((department) => department.id)
  );
  const visibleRooms = departmentId
    ? rooms.filter((room) => room.departmentId === departmentId)
    : [];

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
          {/* Requester identity is derived from the authenticated session and
              deliberately not repeated in the entry form. */}
          <div className={departmentOptions.length === 1 ? "readonly-box request-department-section" : "field request-department-section"}>
            <label className={departmentOptions.length === 1 ? "readonly-box-label" : undefined}>
              {dict.columnDepartment} <span className="required-mark" aria-hidden="true">*</span>
            </label>
            {departmentOptions.length > 1 ? (
              <DepartmentHierarchyPicker
                departments={departments}
                selectedIds={departmentId ? new Set([departmentId]) : new Set()}
                onChange={(ids) => { setDepartmentId(ids.values().next().value ?? ""); setRoomId(""); }}
                locale={entityLocale}
                multiple={false}
                excludedIds={excludedDepartmentIds}
              />
            ) : (
              <span className="readonly-box-value">{departmentName}</span>
            )}
          </div>

          <div className="field request-room-field">
            <label htmlFor="wizard-room">{dict.roomLabel}</label>
            <select id="wizard-room" value={roomId} onChange={(e) => setRoomId(e.target.value)} disabled={!departmentId}>
              <option value="">—</option>
              {visibleRooms.map((r) => (
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
              disabled={!categoryId || !departmentId}
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
                    {/* An item already taken by another row is dropped from
                        this one: the same item twice in one request is two
                        quantities for one thing, which the warehouse then has
                        to reconcile by hand. The row's own current value
                        always stays, or choosing an item would remove it from
                        its own list. */}
                    <ItemPicker
                      items={filteredItems.filter(
                        (item) =>
                          item.id === line.inventoryItemId ||
                          !lines.some((other, otherIndex) => otherIndex !== index && other.inventoryItemId === item.id)
                      )}
                      value={line.inventoryItemId}
                      placeholder={dict.itemSearchPlaceholder}
                      emptyLabel={dict.noMatchingItems}
                      onChange={(itemId) => updateLine(index, { inventoryItemId: itemId })}
                    />
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
            <button type="button" className="btn btn-primary btn-sm" disabled={!canProceed} onClick={() => setStep(3)}>
              {dict.nextStep}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Attachments + submit */}
      {step === 3 && (
        <form onSubmit={handleSubmit}>
          <p style={{ fontSize: 12.5, color: "var(--slate)", margin: "0 0 12px" }}>{dict.attachmentsHint}</p>

          <PendingAttachmentPicker
            files={files}
            uploadLabel={dict.addAttachment}
            emptyLabel={dict.noAttachments}
            onSelect={handleFilesSelected}
            onRemove={(index) => setFiles((current) => current.filter((_, i) => i !== index))}
            removeLabel={dict.removeAttachment}
          />

          {error && (
            <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, margin: "12px 0 0" }}>
              {error}
            </p>
          )}

          <div className="wizard-actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setStep(2)} disabled={submitting}>
              {dict.prevStep}
            </button>
            {/* Enabled even with nothing written: handleSubmit explains what
                is missing, which a greyed-out button cannot. */}
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
              {submitting && <span className="spinner" />}
              {dict.submit}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
