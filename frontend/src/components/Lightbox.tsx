"use client";

import { useEffect } from "react";

// The one reusable lightbox for the whole app (master spec §7: "Build
// exactly one reusable lightbox") — full-size image, caption/filename,
// close button, click-outside close, Escape close. Used from
// AttachmentUploader; not for PDFs/documents, which open in a new tab
// as file chips instead.
export default function Lightbox({
  url,
  filename,
  onClose,
}: {
  url: string;
  filename: string;
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
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <button
        type="button"
        onClick={onClose}
        style={{ position: "absolute", top: "1rem", insetInlineEnd: "1rem" }}
      >
        ×
      </button>
      <img
        src={url}
        alt={filename}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "90vw", maxHeight: "80vh", objectFit: "contain" }}
      />
      <p style={{ color: "white" }}>{filename}</p>
    </div>
  );
}
