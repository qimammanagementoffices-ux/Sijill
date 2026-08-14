"use client";

import { entityName, useEntityLocale } from "@/i18n/entityName";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiFetch, apiUpload, ApiError } from "@/lib/apiClient";
import type { AttachmentDto, FaultTypeDto, LocalizedEntityDto, LocalizedRef, MaintenanceRequestDetail, MaintenancePriority, RoomDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";
import DepartmentHierarchyPicker, { flattenDepartmentHierarchy } from "@/components/DepartmentHierarchyPicker";

const PRIORITIES: MaintenancePriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
type MeData = { departments: LocalizedRef[] };

export default function NewMaintenanceRequestView({
  dict,
  attachmentsDict,
  errorsDict,
  onSubmitted,
  formId,
  onSubmittingChange,
}: {
  dict: Dictionary["maintenanceRequests"];
  attachmentsDict: Dictionary["attachments"];
  errorsDict: Dictionary["errors"];
  onSubmitted: (request: MaintenanceRequestDetail) => void;
  // When set, the submit button renders externally (via
  // <button form={formId}>) instead of inline -- used inside a modal,
  // same pattern as EmployeeForm.
  formId?: string;
  onSubmittingChange?: (submitting: boolean) => void;
}) {
  const entityLocale = useEntityLocale();
  const [departments, setDepartments] = useState<LocalizedEntityDto[] | null>(null);
  const [assignedDepartmentIds, setAssignedDepartmentIds] = useState<Set<string> | null>(null);
  const [rooms, setRooms] = useState<RoomDto[] | null>(null);
  const [faultTypes, setFaultTypes] = useState<FaultTypeDto[] | null>(null);
  const [departmentId, setDepartmentId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [faultTypeId, setFaultTypeId] = useState("");
  const [priority, setPriority] = useState<MaintenancePriority>("MEDIUM");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function priorityLabel(p: MaintenancePriority) {
    return {
      LOW: dict.priorityLow,
      MEDIUM: dict.priorityMedium,
      HIGH: dict.priorityHigh,
      URGENT: dict.priorityUrgent,
    }[p];
  }

  useEffect(() => {
    Promise.all([
      apiFetch<MeData>("/auth/me"),
      apiFetch<LocalizedEntityDto[]>("/departments"),
      apiFetch<RoomDto[]>("/rooms"),
      apiFetch<FaultTypeDto[]>("/maintenance/fault-types"),
    ]).then(([me, departmentRows, roomRows, faultTypeRows]) => {
      const assignedIds = new Set(me.departments.map((department) => department.id));
      setDepartments(departmentRows);
      setAssignedDepartmentIds(assignedIds);
      setRooms(roomRows.filter((room) => room.active));
      setFaultTypes(faultTypeRows);
      setDepartmentId(assignedIds.size === 1 ? assignedIds.values().next().value ?? "" : "");
      setFaultTypeId(faultTypeRows[0]?.id ?? "");
    });
  }, [entityLocale]);

  useEffect(() => {
    onSubmittingChange?.(submitting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitting]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!departmentId) {
      setError(entityLocale === "ar"
        ? "اختيار القسم مطلوب."
        : entityLocale === "hi"
          ? "विभाग चुनना आवश्यक है।"
          : "Department selection is required.");
      return;
    }
    setSubmitting(true);
    try {
      const selectedRoom = rooms?.find((room) => room.id === roomId);
      const created = await apiFetch<MaintenanceRequestDetail>("/maintenance/requests", {
        method: "POST",
        body: JSON.stringify({
          departmentId: departmentId || null,
          faultTypeId: faultTypeId || null,
          location: selectedRoom?.nameAr || null,
          priority,
          description: description || null,
        }),
      });

      let uploadFailed = false;
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        try {
          await apiUpload<AttachmentDto>(`/attachments?ownerType=MAINTENANCE&ownerId=${created.id}`, formData);
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

  if (!departments || !assignedDepartmentIds || !rooms || !faultTypes) return <SectionLoading />;

  const visibleRooms = rooms.filter((room) => !departmentId || room.departmentId === departmentId);
  const assignedDepartments = flattenDepartmentHierarchy(departments, entityLocale)
    .filter(({ item }) => assignedDepartmentIds.has(item.id));
  const excludedDepartmentIds = new Set(
    departments.filter((department) => !assignedDepartmentIds.has(department.id)).map((department) => department.id)
  );

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length) setFiles((current) => [...current, ...picked]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="maintenance-request-form">
      <div className="form-grid">
        <div className={assignedDepartments.length === 1 ? "readonly-box request-department-section span2" : "field request-department-section span2"}>
          <label className={assignedDepartments.length === 1 ? "readonly-box-label" : undefined}>
            {dict.departmentLabel} <span className="required-mark" aria-hidden="true">*</span>
          </label>
          {assignedDepartments.length === 1 ? (
            <span className="readonly-box-value">{assignedDepartments[0]!.path}</span>
          ) : (
            <DepartmentHierarchyPicker
              departments={departments}
              selectedIds={departmentId ? new Set([departmentId]) : new Set()}
              onChange={(ids) => { setDepartmentId(ids.values().next().value ?? ""); setRoomId(""); }}
              locale={entityLocale}
              multiple={false}
              excludedIds={excludedDepartmentIds}
            />
          )}
        </div>
        <div className="field">
          <label>{dict.roomLabel}</label>
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            <option value="">—</option>
            {visibleRooms.map((room) => (
              <option key={room.id} value={room.id}>{entityName(room, entityLocale)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{dict.faultTypeLabel}</label>
          <select value={faultTypeId} onChange={(e) => setFaultTypeId(e.target.value)}>
            <option value="">—</option>
            {faultTypes.map((faultType) => (
              <option key={faultType.id} value={faultType.id}>{entityName(faultType, entityLocale)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{dict.priorityLabel}</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as MaintenancePriority)}>
            {PRIORITIES.map((value) => <option key={value} value={value}>{priorityLabel(value)}</option>)}
          </select>
        </div>
        <div className="field span2">
          <label>{dict.descriptionLabel}</label>
          <textarea value={description} placeholder={dict.descriptionPlaceholder} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="field span2">
          <label>{dict.attachmentsHint}</label>
          <div className="maintenance-request-upload filebox">
            <label className="upl">
              <span aria-hidden="true">📎</span>
              {dict.addAttachment}
              <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFilesSelected} />
            </label>
            <span>{files.length === 0 ? attachmentsDict.noAttachments : files.map((file) => file.name).join("، ")}</span>
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
          {dict.submit}
        </button>
      )}
    </form>
  );
}
