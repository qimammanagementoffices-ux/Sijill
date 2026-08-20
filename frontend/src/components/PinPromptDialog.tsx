"use client";

import { useState } from "react";

// Replaces window.prompt() for PIN entry. The native prompt renders the PIN in
// cleartext in browser chrome, cannot mask input, and asked for the PIN and its
// confirmation in two separate windows -- where a mismatch silently cancelled
// with nothing shown. It also carries the origin in its title, which is exactly
// the shape a credential phishing overlay imitates.
export default function PinPromptDialog({
  title,
  pinLabel,
  pinConfirmLabel,
  submitLabel,
  cancelLabel,
  mismatchMessage,
  onSubmit,
  onCancel,
}: {
  title: string;
  pinLabel: string;
  pinConfirmLabel: string;
  submitLabel: string;
  cancelLabel: string;
  mismatchMessage: string;
  onSubmit: (pin: string, pinConfirm: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin !== pinConfirm) {
      // The old two-prompt flow just returned here, so a typo looked like the
      // reset had worked.
      setError(mismatchMessage);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(pin, pinConfirm);
    } catch (err) {
      // Surfaces the server's policy message (length, trivial PIN) instead of
      // an unhandled rejection in the console.
      setError(err instanceof Error ? err.message : mismatchMessage);
      setSubmitting(false);
    }
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="pin-prompt-title">
      <div className="modal">
        <div className="modal-head">
          <h3 id="pin-prompt-title">{title}</h3>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="close" disabled={submitting}>
            ×
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="field">
              <label htmlFor="pin-prompt-pin">{pinLabel}</label>
              <input
                id="pin-prompt-pin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="field" style={{ marginTop: 14 }}>
              <label htmlFor="pin-prompt-confirm">{pinConfirmLabel}</label>
              <input
                id="pin-prompt-confirm"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value)}
                required
              />
            </div>
            {error && (
              <p role="alert" className="form-error form-error-block">
                {error}
              </p>
            )}
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-outline btn-sm" onClick={onCancel} disabled={submitting}>
              {cancelLabel}
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
              {submitting && <span className="spinner" />}
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
