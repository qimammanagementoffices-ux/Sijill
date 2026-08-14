"use client";

export default function PendingAttachmentPicker({
  files,
  uploadLabel,
  emptyLabel,
  hint,
  accept = "image/jpeg,image/png,image/webp,application/pdf",
  multiple = true,
  onSelect,
  onRemove,
  removeLabel = "remove",
  disabled = false,
}: {
  files: File[];
  uploadLabel: string;
  emptyLabel: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
  onSelect: (files: File[]) => void;
  onRemove: (index: number) => void;
  removeLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="attachment-picker">
      <label className={`attachment-picker-dropzone${disabled ? " disabled" : ""}`}>
        <span className="attachment-picker-icon" aria-hidden="true">📎</span>
        <span className="attachment-picker-copy">
          <b>{uploadLabel}</b>
          {hint && <small>{hint}</small>}
        </span>
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(event) => {
            const selected = Array.from(event.target.files ?? []);
            if (selected.length > 0) onSelect(selected);
            event.target.value = "";
          }}
        />
      </label>

      {files.length === 0 ? (
        emptyLabel && <span className="attachment-picker-empty">{emptyLabel}</span>
      ) : (
        <div className="attachment-picker-files">
          {files.map((file, index) => (
            <span className="attachment-picker-file" key={`${file.name}-${file.size}-${index}`}>
              <span title={file.name}>{file.name}</span>
              <button type="button" onClick={() => onRemove(index)} aria-label={removeLabel}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
