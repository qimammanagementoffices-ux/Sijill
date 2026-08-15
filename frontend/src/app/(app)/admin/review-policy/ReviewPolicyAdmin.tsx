"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import SectionLoading from "@/components/SectionLoading";
import Toast from "@/components/Toast";
import type { ReviewPolicyDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

type Key = keyof ReviewPolicyDto;

export default function ReviewPolicyAdmin({
  dict,
  commonDict,
  errorsDict,
}: {
  dict: Dictionary["reviewPolicy"];
  commonDict: Dictionary["common"];
  errorsDict: Dictionary["errors"];
}) {
  const [policy, setPolicy] = useState<ReviewPolicyDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToastState] = useState<{ message: string; error: boolean } | null>(null);

  useEffect(() => {
    apiFetch<ReviewPolicyDto>("/review-policy")
      .then(setPolicy)
      .catch(() => setToastState({ message: errorsDict.generic, error: true }));
  }, [errorsDict.generic]);

  // Saved on toggle rather than behind a Save button: there are three
  // booleans and nothing to validate across them, so a separate confirm step
  // would only add a way to lose the change.
  async function toggle(key: Key) {
    if (!policy || saving) return;
    const next = { ...policy, [key]: !policy[key] };
    setPolicy(next);
    setSaving(true);
    try {
      setPolicy(await apiFetch<ReviewPolicyDto>("/review-policy", { method: "PUT", body: JSON.stringify(next) }));
      setToastState({ message: commonDict.actionSuccess, error: false });
    } catch {
      setPolicy(policy); // put the switch back where it was
      setToastState({ message: errorsDict.generic, error: true });
    } finally {
      setSaving(false);
    }
  }

  const rows: { key: Key; label: string }[] = [
    { key: "warehouseTwoLevel", label: dict.warehouse },
    { key: "maintenanceTwoLevel", label: dict.maintenance },
    { key: "assetTwoLevel", label: dict.asset },
  ];

  return (
    <>
      <div className="no-print">
        <div className="eyebrow">{dict.title}</div>
        <h1 className="section-title disp">{dict.title}</h1>
      </div>

      <div className="panel">
        <div className="panel-body">
          <p className="request-dialog-desc">{dict.description}</p>

          {!policy ? (
            <SectionLoading />
          ) : (
            <ul className="review-policy-list">
              {rows.map((row) => (
                <li key={row.key} className="review-policy-row">
                  <label htmlFor={row.key}>{row.label}</label>
                  <input
                    id={row.key}
                    type="checkbox"
                    role="switch"
                    checked={policy[row.key]}
                    disabled={saving}
                    onChange={() => void toggle(row.key)}
                  />
                </li>
              ))}
            </ul>
          )}

          <p className="request-timeline-note">{dict.openRequestsNote}</p>
        </div>
      </div>

      {toast && (
        <Toast message={toast.message} error={toast.error} onDismiss={() => setToastState(null)} />
      )}
    </>
  );
}
