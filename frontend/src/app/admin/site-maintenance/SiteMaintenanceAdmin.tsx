"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiUpload, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { AttachmentDto, MaintenanceDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

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

export default function SiteMaintenanceAdmin({ dict }: { dict: Dictionary["siteMaintenanceAdmin"] }) {
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

  async function save(imageAttachmentId: string | null | undefined) {
    if (!setting) return;
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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
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
      await save(uploaded.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleImageRemove() {
    if (!setting?.imageAttachmentId) return;
    setError(null);
    setUploading(true);
    try {
      const attachmentId = setting.imageAttachmentId;
      await save(null);
      await apiFetch(`/attachments/${attachmentId}`, { method: "DELETE" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  if (!setting) return null;

  return (
    <main style={{ maxWidth: 600, margin: "5vh auto", padding: "0 1rem" }}>
      <h1>{dict.title}</h1>
      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{dict.saveSuccess}</p>}

      <label>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        {dict.enabledLabel}
      </label>

      <label>
        {dict.messageArLabel}
        <textarea value={messageAr} onChange={(e) => setMessageAr(e.target.value)} dir="rtl" />
      </label>

      <label>
        {dict.messageEnLabel}
        <textarea value={messageEn} onChange={(e) => setMessageEn(e.target.value)} dir="ltr" />
      </label>

      <label>
        {dict.messageHiLabel}
        <textarea value={messageHi} onChange={(e) => setMessageHi(e.target.value)} dir="ltr" />
      </label>

      <label>
        {dict.imageLabel}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageUpload}
          disabled={uploading}
        />
      </label>
      {setting.imageUrl && (
        <div>
          <img src={setting.imageUrl} alt="" style={{ maxWidth: 300, display: "block" }} />
          <button type="button" onClick={handleImageRemove} disabled={uploading}>
            {dict.removeImage}
          </button>
        </div>
      )}

      <label>
        {dict.reopenAtLabel}
        <input type="datetime-local" value={reopenAt} onChange={(e) => setReopenAt(e.target.value)} />
      </label>

      <p>
        <button type="button" onClick={() => save(undefined)}>
          {dict.save}
        </button>
      </p>
    </main>
  );
}
