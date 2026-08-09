"use client";

import { useState, type FormEvent } from "react";
import { apiFetch, apiUpload, ApiError } from "@/lib/apiClient";
import type { AttachmentDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

type SelfEmployee = {
  id: string;
  name: string;
  phone: string;
  photoUrl: string | null;
  photoAttachmentId: string | null;
};

export default function EditProfileModal({
  employee,
  dict,
  errorsDict,
  commonDict,
  dashboardDict,
  onClose,
  onUpdated,
}: {
  employee: SelfEmployee;
  dict: Dictionary["employees"];
  errorsDict: Dictionary["errors"];
  commonDict: Dictionary["common"];
  dashboardDict: Dictionary["dashboard"];
  onClose: () => void;
  onUpdated: (employee: SelfEmployee) => void;
}) {
  const [name, setName] = useState(employee.name);
  const [phone, setPhone] = useState(employee.phone);
  const [photoAttachmentId, setPhotoAttachmentId] = useState(employee.photoAttachmentId);
  const [photoUrl, setPhotoUrl] = useState(employee.photoUrl);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPhotoUploading(true);
    try {
      const previousId = photoAttachmentId;
      const formData = new FormData();
      formData.append("file", file);
      const uploaded = await apiUpload<AttachmentDto>(
        `/attachments?ownerType=EMPLOYEE&ownerId=${employee.id}`,
        formData
      );
      setPhotoAttachmentId(uploaded.id);
      setPhotoUrl(uploaded.url);
      if (previousId && previousId !== uploaded.id) {
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
      try {
        await apiFetch(`/attachments/${attachmentId}`, { method: "DELETE" });
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 404)) throw err;
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
    setSubmitting(true);
    try {
      const updated = await apiFetch<SelfEmployee>("/auth/me", {
        method: "PUT",
        body: JSON.stringify({ name, phone, photoAttachmentId }),
      });
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorsDict.generic);
      setSubmitting(false);
    }
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-head">
          <h3>{dashboardDict.editProfile}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="close" disabled={submitting}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <form id="edit-profile-form" onSubmit={handleSubmit}>
            <div className="field" style={{ marginBottom: 18 }}>
              <label>{dict.photoLabel}</label>
              <div className="filebox">
                <label className="upl">
                  {dict.photoLabel}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoUpload}
                    disabled={photoUploading}
                  />
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
            </div>

            {error && (
              <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, marginTop: 12 }}>
                {error}
              </p>
            )}
          </form>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose} disabled={submitting}>
            {commonDict.cancel}
          </button>
          <button type="submit" form="edit-profile-form" className="btn btn-primary btn-sm" disabled={submitting || photoUploading}>
            {submitting && <span className="spinner" />}
            {dict.submitUpdate}
          </button>
        </div>
      </div>
    </div>
  );
}
