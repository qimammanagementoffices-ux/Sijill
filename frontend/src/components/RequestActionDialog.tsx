export default function RequestActionDialog({
  title,
  reasonLabel,
  cancelLabel,
  submitting,
  reason,
  onReasonChange,
  onConfirm,
  onCancel,
}: {
  title: string;
  reasonLabel: string;
  cancelLabel: string;
  submitting: boolean;
  reason: string;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal">
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="close" disabled={submitting}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>{reasonLabel}</label>
            <textarea value={reason} onChange={(event) => onReasonChange(event.target.value)} autoFocus />
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-outline btn-sm" onClick={onCancel} disabled={submitting}>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onConfirm} disabled={submitting}>
            {submitting && <span className="spinner" />}
            {title}
          </button>
        </div>
      </div>
    </div>
  );
}
