"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, apiUpload, ApiError } from "@/lib/apiClient";
import type { AttachmentDto, AttachmentOwnerType } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import Lightbox from "./Lightbox";

// Reused across item/room/asset screens (master spec §7: "Use it in
// management screens and item/asset selection screens inside requests").
export default function AttachmentUploader({
  ownerType,
  ownerId,
  dict,
  canManage,
  showUpload = true,
  onAction,
}: {
  ownerType: AttachmentOwnerType;
  ownerId: string;
  dict: Dictionary["attachments"];
  canManage: boolean;
  // The item card shows attachments read-only -- uploading happens in the
  // edit dialog, so the card would otherwise carry a second upload button
  // labelled with the section title.
  showUpload?: boolean;
  // Fires after a successful upload/delete -- the toast text itself lives
  // with the caller (commonDict.actionSuccess) so this component doesn't
  // need Dictionary["common"] threaded through just for one string.
  onAction?: () => void;
}) {
  const [attachments, setAttachments] = useState<AttachmentDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<AttachmentDto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    apiFetch<AttachmentDto[]>(`/attachments?ownerType=${ownerType}&ownerId=${ownerId}`)
      .then(setAttachments)
      .catch(() => setAttachments([]));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerType, ownerId]);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("ownerType", ownerType);
      formData.append("ownerId", ownerId);
      formData.append("file", file);
      await apiUpload(`/attachments?ownerType=${ownerType}&ownerId=${ownerId}`, formData);
      load();
      onAction?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiFetch(`/attachments/${id}`, { method: "DELETE" });
      load();
      onAction?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  if (!attachments) return null;

  return (
    <div className="panel-body" style={{ padding: "14px 0 0" }}>
      <h3 style={{ margin: "0 0 10px", fontSize: 13.5 }}>{dict.title}</h3>
      {error && (
        <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, marginBottom: 8 }}>
          {error}
        </p>
      )}

      {attachments.length === 0 && <p style={{ fontSize: 12.5, color: "var(--slate)" }}>{dict.noAttachments}</p>}

      <div className="thumb-strip">
        {attachments.map((a) => (
          <div key={a.id} className="attachment-card">
            {a.contentType.startsWith("image/") ? (
              <img src={a.url} alt={a.filename} data-viewable onClick={() => setPreview(a)} className="attachment-thumb" />
            ) : (
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="attachment-file">
                {a.filename}
              </a>
            )}
            {canManage && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDelete(a.id)}>
                {dict.delete}
              </button>
            )}
          </div>
        ))}
      </div>

      {canManage && showUpload && (
        <div className="filebox" style={{ marginTop: 10 }}>
          <label className="upl">
            {dict.title}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileSelected}
              style={{ display: "none" }}
            />
          </label>
          {uploading && <span className="spinner" />}
        </div>
      )}

      {preview && <Lightbox url={preview.url} filename={preview.filename} onClose={() => setPreview(null)} />}
    </div>
  );
}
