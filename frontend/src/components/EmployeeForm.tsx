"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, apiUpload, ApiError } from "@/lib/apiClient";
import PermissionGrid from "@/components/PermissionGrid";
import DepartmentHierarchyPicker, { isValidEmployeeDepartmentSelection } from "@/components/DepartmentHierarchyPicker";
import type {
  AttachmentDto,
  EmployeeDetail,
  LocalizedEntityDto,
  PermissionDto,
} from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

// Sentinel ownerId for a photo uploaded during employee creation, before the
// employee row (and its real id) exists yet -- owner_id is just polymorphic
// metadata on the attachment row, never a real foreign key, so this is safe
// (same trick BrandingAdmin/SiteMaintenanceAdmin use for their singletons).
const NEW_EMPLOYEE_PHOTO_OWNER_ID = "00000000-0000-0000-0000-000000000001";

type Props = {
  dict: Dictionary["employees"];
  errorsDict: Dictionary["errors"];
  permissionDict: Dictionary["permission"];
  locale: string;
  mode: "create" | "edit";
  initial?: EmployeeDetail;
  departments: LocalizedEntityDto[];
  jobTitles: LocalizedEntityDto[];
  allPermissions: PermissionDto[];
  onSubmitted: (employee: EmployeeDetail) => void;
  onConflict?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  // When set, the form's submit/cancel buttons render in an external sticky
  // footer (via <button form={formId}>) instead of inline at the end of the
  // form's own content -- needed inside a modal, where the form scrolls but
  // the action buttons shouldn't have to be scrolled to.
  formId?: string;
  onSubmittingChange?: (submitting: boolean) => void;
};

export default function EmployeeForm({
  dict,
  errorsDict,
  permissionDict,
  locale,
  mode,
  initial,
  departments,
  jobTitles,
  allPermissions,
  onSubmitted,
  onConflict,
  onCancel,
  cancelLabel,
  formId,
  onSubmittingChange,
}: Props) {
  const localizedName = (entity: LocalizedEntityDto) => (locale === "ar" ? entity.nameAr : entity.nameEn);
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [nationalId, setNationalId] = useState(initial?.nationalId ?? "");
  const [joinedDate, setJoinedDate] = useState(initial?.joinedDate ?? "");
  const [jobTitleId, setJobTitleId] = useState(initial?.jobTitle?.id ?? "");
  const [departmentIds, setDepartmentIds] = useState<Set<string>>(
    new Set(initial?.departments.map((d) => d.id) ?? [])
  );
  const [permissionKeys, setPermissionKeys] = useState<Set<string>>(
    new Set(initial?.permissions ?? [])
  );
  const [photoAttachmentId, setPhotoAttachmentId] = useState<string | null>(initial?.photoAttachmentId ?? null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initial?.photoUrl ?? null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    onSubmittingChange?.(submitting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitting]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPhotoUploading(true);
    try {
      const ownerId = initial?.id ?? NEW_EMPLOYEE_PHOTO_OWNER_ID;
      const previousId = photoAttachmentId;
      const formData = new FormData();
      formData.append("file", file);
      const uploaded = await apiUpload<AttachmentDto>(
        `/attachments?ownerType=EMPLOYEE&ownerId=${ownerId}`,
        formData
      );
      setPhotoAttachmentId(uploaded.id);
      setPhotoUrl(uploaded.url);
      // A persisted photo is still referenced by the employee row until
      // submit, so deleting it here violates the foreign key. The backend
      // removes it after the employee update clears that reference. Only
      // clean up a superseded upload that has never been saved.
      if (previousId && previousId !== uploaded.id && previousId !== initial?.photoAttachmentId) {
        try {
          await apiFetch(`/attachments/${previousId}`, { method: "DELETE" });
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 404)) throw err;
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorsDict.generic);
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handlePhotoRemove() {
    if (!photoAttachmentId || photoUploading) return;
    setError(null);
    setPhotoUploading(true);
    try {
      const attachmentId = photoAttachmentId;
      setPhotoAttachmentId(null);
      setPhotoUrl(null);
      // Persisted photos are cleared and deleted by EmployeeService when
      // the form is submitted. An unsaved upload has no database reference,
      // so it is safe (and necessary) to delete immediately.
      if (attachmentId !== initial?.photoAttachmentId) {
        try {
          await apiFetch(`/attachments/${attachmentId}`, { method: "DELETE" });
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 404)) throw err;
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorsDict.generic);
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidEmployeeDepartmentSelection(departments, departmentIds)) {
      setError(locale === "ar"
        ? "يجب اختيار إدارة واحدة على الأقل، ويمكن اختيار عدة إدارات وما يتبعها من مراحل وأقسام."
        : locale === "hi"
          ? "कम से कम एक प्रशासन चुनें; आप कई प्रशासन और उनके चरण व विभाग चुन सकते हैं।"
          : "Choose at least one administration; multiple administrations and their stages and departments are allowed.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "create") {
        const created = await apiFetch<EmployeeDetail>("/employees", {
          method: "POST",
          body: JSON.stringify({
            name,
            phone,
            pin,
            pinConfirm,
            email: email || null,
            nationalId: nationalId || null,
            joinedDate: joinedDate || null,
            jobTitleId: jobTitleId || null,
            departmentIds: Array.from(departmentIds),
            permissionKeys: Array.from(permissionKeys),
            photoAttachmentId,
          }),
        });
        onSubmitted(created);
      } else if (initial) {
        const updated = await apiFetch<EmployeeDetail>(`/employees/${initial.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name,
            phone,
            email: email || null,
            nationalId: nationalId || null,
            jobTitleId: jobTitleId || null,
            departmentIds: Array.from(departmentIds),
            photoAttachmentId,
            version: initial.version,
          }),
        });

        const permissionsChanged =
          permissionKeys.size !== new Set(initial.permissions).size ||
          Array.from(permissionKeys).some((k) => !initial.permissions.includes(k));

        if (permissionsChanged) {
          const withPermissions = await apiFetch<EmployeeDetail>(
            `/employees/${initial.id}/permissions`,
            {
              method: "PUT",
              body: JSON.stringify({
                permissionKeys: Array.from(permissionKeys),
                version: updated.version,
              }),
            }
          );
          onSubmitted(withPermissions);
        } else {
          onSubmitted(updated);
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && onConflict) {
        onConflict();
      } else {
        setError(err instanceof ApiError ? err.message : errorsDict.generic);
      }
      setSubmitting(false);
    }
  }

  return (
    <form id={formId} onSubmit={handleSubmit}>
      <div className="panel">
        <div className="panel-body">
          <div className="field" style={{ marginBottom: 18 }}>
            <label>{dict.photoLabel}</label>
            <div className="filebox">
              <label className="upl">
                {dict.photoLabel}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} disabled={photoUploading} />
              </label>
            </div>
            {(photoUrl || photoUploading) && (
              <div className="thumb-strip" style={{ marginTop: 10, alignItems: "flex-start" }}>
                <div
                  style={{
                    position: "relative",
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "var(--paper-dim)",
                    flex: "none",
                  }}
                >
                  {photoUrl && (
                    <img src={photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                  {photoUploading && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(27, 42, 74, 0.45)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span className="spinner" />
                    </div>
                  )}
                </div>
                {photoUrl && !photoUploading && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={handlePhotoRemove} disabled={photoUploading}>
                    {dict.removePhoto}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="form-grid">
            <div className="field">
              <label>{dict.nameLabel}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={dict.namePlaceholder}
                required
              />
            </div>
            <div className="field">
              <label>{dict.phoneLabel}</label>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={dict.phonePlaceholder}
                required
              />
            </div>
            {mode === "create" && (
              <>
                <div className="field">
                  <label>{dict.pinLabel}</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder={dict.pinPlaceholder}
                    required
                  />
                </div>
                <div className="field">
                  <label>{dict.pinConfirmLabel}</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={pinConfirm}
                    onChange={(e) => setPinConfirm(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
            <div className="field">
              <label>{dict.emailLabel}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={dict.emailPlaceholder}
              />
            </div>
            <div className="field">
              <label>{dict.nationalIdLabel}</label>
              <input
                type="text"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder={dict.nationalIdPlaceholder}
              />
            </div>
            {mode === "create" && (
              <div className="field">
                <label>{dict.joinedDateLabel}</label>
                <input type="date" value={joinedDate} onChange={(e) => setJoinedDate(e.target.value)} />
              </div>
            )}
            <div className="field">
              <label>{dict.jobTitleLabel}</label>
              <select value={jobTitleId} onChange={(e) => setJobTitleId(e.target.value)}>
                <option value="">—</option>
                {jobTitles.map((jt) => (
                  <option key={jt.id} value={jt.id}>
                    {localizedName(jt)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field span2" style={{ marginTop: 18 }}>
            <label>{dict.departmentsLabel}</label>
            <p className="panel-note" style={{ padding: 0, margin: "-4px 0 8px" }}>
              {dict.departmentsHint}
            </p>
            <DepartmentHierarchyPicker
              departments={departments}
              selectedIds={departmentIds}
              onChange={setDepartmentIds}
              locale={locale}
              employeeAssignment
            />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>{dict.permissionsLabel}</h3>
        </div>
        <div className="panel-body">
          <PermissionGrid
            allPermissions={allPermissions}
            selected={permissionKeys}
            onChange={setPermissionKeys}
            permissionDict={permissionDict}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="form-error-alert">
          <span aria-hidden="true" className="form-error-alert-icon">!</span>
          {error}
        </p>
      )}
      {!formId && (
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting && <span className="spinner" />}
            {mode === "create" ? dict.submitCreate : dict.submitUpdate}
          </button>
          {onCancel && (
            <button type="button" className="btn btn-outline" onClick={onCancel} disabled={submitting}>
              {cancelLabel}
            </button>
          )}
        </div>
      )}
    </form>
  );
}
