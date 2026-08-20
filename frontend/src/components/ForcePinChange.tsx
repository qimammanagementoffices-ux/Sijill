"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiClient";

// Shown instead of the app when an employee's PIN no longer meets policy.
// Deliberately has no dismiss and no navigation: the account keeps working
// against the API, so a skippable prompt would simply never be actioned.
export default function ForcePinChange({ onDone }: { onDone: () => void }) {
  const [currentPin, setCurrentPin] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiFetch("/auth/me/pin", {
        method: "PUT",
        body: JSON.stringify({ currentPin, pin, pinConfirm }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change the PIN");
      setSaving(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>تغيير الرمز السري</h1>
        <p>رمزك السري الحالي لم يعد يفي بمتطلبات الأمان. اختر رمزاً جديداً من 6 أرقام للمتابعة.</p>
        <form onSubmit={submit}>
          <div className="field">
            <label>الرمز الحالي</label>
            <input
              type="password"
              inputMode="numeric"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label>الرمز الجديد</label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label>تأكيد الرمز الجديد</label>
            <input
              type="password"
              inputMode="numeric"
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value)}
              required
            />
          </div>
          {error && (
            <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, marginTop: 10 }}>
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={saving}>
            {saving && <span className="spinner" />}
            حفظ
          </button>
        </form>
      </div>
    </div>
  );
}
