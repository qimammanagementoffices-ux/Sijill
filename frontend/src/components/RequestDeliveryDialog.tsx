"use client";

import { useMemo, useState } from "react";
import PendingAttachmentPicker from "@/components/PendingAttachmentPicker";
import type { Dictionary } from "@/i18n/getDictionary";
import type { NeedRequestLineDto } from "@/lib/types";

// The legacy "إنهاء التسليم — تقرير الأصناف" modal: the storekeeper records
// what actually left the warehouse.
//
// Each row starts at the quantity the last official settled on — the
// counter-signed figure, not what was originally asked for — and can be moved
// up or down from there, because what physically left the store is a fact, not
// a decision. The one limit is stock on hand: issuing what is not there is the
// only entry that cannot be true, and the server refuses it as well.
export default function RequestDeliveryDialog({
  lines,
  submitting,
  dict,
  commonDict,
  onConfirm,
  onCancel,
}: {
  lines: NeedRequestLineDto[];
  submitting: boolean;
  dict: Dictionary["requestDelivery"];
  commonDict: Dictionary["common"];
  onConfirm: (
    body: { lines: { lineId: string; quantityIssued: number }[]; notes: string | null },
    files: File[]
  ) => void;
  onCancel: () => void;
}) {
  const deliverable = useMemo(
    () =>
      lines
        .filter((line) => !line.removed)
        .map((line) => ({ line, approved: line.quantityApproved ?? line.quantityRequested })),
    [lines]
  );

  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [issued, setIssued] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      deliverable.map(({ line, approved }) => [
        line.id,
        // Starts at what was approved, but never proposes issuing stock that
        // is not there.
        Math.min(approved, line.itemQuantity),
      ])
    )
  );
  const [error, setError] = useState<string | null>(null);

  const visible = deliverable.filter(({ line }) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return (
      line.itemNameAr.toLowerCase().includes(needle) ||
      line.itemNameEn.toLowerCase().includes(needle) ||
      line.itemCode.toLowerCase().includes(needle)
    );
  });
  const selectedCount = deliverable.filter(({ line }) => (issued[line.id] ?? 0) > 0).length;

  function submit() {
    const total = deliverable.reduce((sum, { line }) => sum + (issued[line.id] ?? 0), 0);
    if (deliverable.length > 0 && total === 0) {
      setError(dict.atLeastOne);
      return;
    }
    onConfirm(
      {
        lines: deliverable.map(({ line }) => ({ lineId: line.id, quantityIssued: issued[line.id] ?? 0 })),
        notes: notes.trim() || null,
      },
      files
    );
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={dict.title}>
      <div className="modal wide">
        <div className="modal-head">
          <h3>{dict.title}</h3>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="close" disabled={submitting}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <p className="request-dialog-desc">{dict.description}</p>

          {deliverable.length === 0 ? (
            <div className="empty">
              <b>{dict.noItems}</b>
            </div>
          ) : (
            <>
              <div className="field">
                <input
                  type="search"
                  value={search}
                  placeholder={dict.searchPlaceholder}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <span className="chip chip-sm">{dict.selectedCount.replace("{n}", String(selectedCount))}</span>

              <ul className="delivery-lines">
                {visible.map(({ line, approved }) => {
                  // Stock is the only ceiling: the approved figure is a
                  // decision, what is on the shelf is a fact.
                  const cap = line.itemQuantity;
                  return (
                    <li key={line.id} className="delivery-line">
                      <div className="delivery-line-text">
                        <b>{line.itemNameAr}</b>
                        <small>
                          {dict.remaining.replace("{qty}", String(approved))}
                          {" · "}
                          {dict.availableStock
                            .replace("{qty}", String(line.itemQuantity))
                            .replace("{unit}", line.itemUnit ?? "")}
                        </small>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={cap}
                        value={issued[line.id] ?? 0}
                        onChange={(event) =>
                          setIssued((current) => ({
                            ...current,
                            [line.id]: Math.max(0, Math.min(cap, Number(event.target.value))),
                          }))
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <div className="field">
            <label htmlFor="delivery-notes">{dict.notesLabel}</label>
            <textarea
              id="delivery-notes"
              value={notes}
              placeholder={dict.notesPlaceholder}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          {/* Proof of delivery. Uploaded under its own owner type after the
              delivery is recorded, so it never mixes with the requester's
              own attachments on the card. */}
          <div className="field">
            <label>{dict.attachmentsHint}</label>
            <PendingAttachmentPicker
              files={files}
              uploadLabel={dict.addAttachment}
              emptyLabel={dict.noAttachments}
              removeLabel={dict.removeAttachment}
              disabled={submitting}
              onSelect={(selected) => setFiles((current) => [...current, ...selected])}
              onRemove={(index) => setFiles((current) => current.filter((_, i) => i !== index))}
            />
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-outline btn-sm" onClick={onCancel} disabled={submitting}>
            {commonDict.cancel}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={submitting}>
            {submitting && <span className="spinner" />}
            {dict.submit}
          </button>
        </div>
      </div>
    </div>
  );
}
