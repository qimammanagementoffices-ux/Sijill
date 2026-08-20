"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiUpload, ApiError } from "@/lib/apiClient";
import PendingAttachmentPicker from "@/components/PendingAttachmentPicker";
import { getToken } from "@/lib/auth";
import type { AttachmentDto, MaintenanceDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";
import Toast from "@/components/Toast";

// Fixed synthetic owner id for the single maintenance_setting row — same
// pattern as BrandingAdmin.tsx's BRANDING_OWNER_ID (the row has no UUID id
// of its own, it's a single-row table keyed by a boolean).
const MAINTENANCE_OWNER_ID = "00000000-0000-0000-0000-000000000001";

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SiteMaintenanceAdmin({ dict, locale }: { dict: Dictionary["siteMaintenanceAdmin"]; locale: string }) {
  const router = useRouter();
  const [setting, setSetting] = useState<MaintenanceDto | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [messageAr, setMessageAr] = useState("");
  const [messageEn, setMessageEn] = useState("");
  const [messageHi, setMessageHi] = useState("");
  const [reopenAt, setReopenAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);

  function load() {
    apiFetch<MaintenanceDto>("/maintenance")
      .then((m) => {
        setSetting(m);
        setEnabled(m.enabled);
        setMessageAr(m.messageAr ?? "");
        setMessageEn(m.messageEn ?? "");
        setMessageHi(m.messageHi ?? "");
        setReopenAt(toDatetimeLocalValue(m.reopenAt));
      })
      .catch(() => router.replace("/dashboard"));
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function save(imageAttachmentId: string | null | undefined): Promise<boolean> {
    if (!setting) return false;
    setError(null);
    setSuccess(false);
    try {
      const updated = await apiFetch<MaintenanceDto>("/maintenance", {
        method: "PUT",
        body: JSON.stringify({
          enabled,
          messageAr: messageAr || null,
          messageEn: messageEn || null,
          messageHi: messageHi || null,
          imageAttachmentId: imageAttachmentId !== undefined ? imageAttachmentId : setting.imageAttachmentId,
          reopenAt: reopenAt ? new Date(reopenAt).toISOString() : null,
          version: setting.version,
        }),
      });
      setSetting(updated);
      setSuccess(true);
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
      return false;
    }
  }

  async function handleImageUpload(file: File | undefined) {
    if (!file || !setting) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("ownerType", "MAINTENANCE");
      formData.append("ownerId", MAINTENANCE_OWNER_ID);
      formData.append("file", file);
      const uploaded = await apiUpload<AttachmentDto>(
        `/attachments?ownerType=MAINTENANCE&ownerId=${MAINTENANCE_OWNER_ID}`,
        formData
      );
      const saved = await save(uploaded.id);
      if (!saved) {
        // The failed settings update never referenced this upload, so clean
        // it up without replacing the more useful save error above.
        try {
          await apiFetch(`/attachments/${uploaded.id}`, { method: "DELETE" });
        } catch {}
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleImageRemove() {
    if (!setting?.imageAttachmentId || uploading) return;
    setError(null);
    setUploading(true);
    try {
      await save(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  if (!setting) return <SectionLoading />;

  return (
    <>
      <div className="eyebrow">{dict.title}</div>
      <h1 className="section-title disp">{dict.title}</h1>
      {error && (
        <p role="alert" className="form-error form-error-block">
          {error}
        </p>
      )}
      {success && <Toast message={dict.saveSuccess} onDismiss={() => setSuccess(false)} />}

      <div className="panel">
        <div className="panel-body">
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, fontWeight: 700, fontSize: 13 }}>
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            {dict.enabledLabel}
          </label>

          <div className="form-grid full" style={{ marginBottom: 18 }}>
            <div className="field">
              <label>{dict.messageArLabel}</label>
              <textarea value={messageAr} onChange={(e) => setMessageAr(e.target.value)} dir="rtl" />
            </div>
            <div className="field">
              <label>{dict.messageEnLabel}</label>
              <textarea value={messageEn} onChange={(e) => setMessageEn(e.target.value)} dir="ltr" />
            </div>
            <div className="field">
              <label>{dict.messageHiLabel}</label>
              <textarea value={messageHi} onChange={(e) => setMessageHi(e.target.value)} dir="ltr" />
            </div>
          </div>

          <div className="field" style={{ marginBottom: 18 }}>
            <label>{dict.imageLabel}</label>
            <div className="filebox">
              <PendingAttachmentPicker
                files={[]}
                uploadLabel={dict.imageLabel}
                emptyLabel=""
                accept="image/jpeg,image/png,image/webp"
                multiple={false}
                disabled={uploading}
                onSelect={(selected) => void handleImageUpload(selected[0])}
                onRemove={() => {}}
              />
              {uploading && <span className="spinner" />}
            </div>
            {setting.imageUrl && (
              <div className="thumb-strip" style={{ marginTop: 10, alignItems: "flex-start" }}>
                <img src={setting.imageUrl} alt="" style={{ width: 140, height: 140 }} />
                <button type="button" className="btn btn-outline btn-sm" onClick={handleImageRemove} disabled={uploading}>
                  {dict.removeImage}
                </button>
              </div>
            )}
          </div>

          <div className="field" style={{ marginBottom: 18 }}>
            <label>{dict.reopenAtLabel}</label>
            <input type="datetime-local" value={reopenAt} onChange={(e) => setReopenAt(e.target.value)} />
          </div>

          <button type="button" className="btn btn-primary btn-sm" onClick={() => save(undefined)} disabled={uploading}>
            {dict.save}
          </button>
        </div>
      </div>

    </>
  );
}
