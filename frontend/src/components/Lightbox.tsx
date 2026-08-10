"use client";

import { useEffect } from "react";

// The one reusable lightbox for the whole app (master spec §7: "Build
// exactly one reusable lightbox") — full-size image, download, close
// button, click-outside close, Escape close. Used from AttachmentUploader
// and the item list's thumbnail column; not for PDFs/documents, which open
// in a new tab as file chips instead.
export default function Lightbox({
  url,
  filename,
  title,
  downloadLabel,
  closeLabel,
  onClose,
}: {
  url: string;
  filename: string;
  // Optional so existing callers keep working without a dictionary; they
  // fall back to the same wording the legacy dialog used.
  title?: string;
  downloadLabel?: string;
  closeLabel?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title ?? "عرض الصورة"}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="close">
            ×
          </button>
        </div>
        <div className="lightbox-body">
          <img src={url} alt={filename} className="lightbox-img" />
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
            {closeLabel ?? "إغلاق"}
          </button>
          <a className="btn btn-primary btn-sm" href={url} download={filename} target="_blank" rel="noreferrer">
            {downloadLabel ?? "تحميل"}
          </a>
        </div>
      </div>
    </div>
  );
}
