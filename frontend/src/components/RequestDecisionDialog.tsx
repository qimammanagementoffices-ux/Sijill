"use client";

import { useState } from "react";
import type { Dictionary } from "@/i18n/getDictionary";
import type { NeedRequestLineDto, RequestDecisionBody } from "@/lib/types";

// One dialog for every decision in the request workflow: approve, reject,
// postpone, counter-sign, overturn, reject-receipt. They differ only in which
// of the three inputs are shown, so they share one component rather than six
// near-identical copies.
export default function RequestDecisionDialog({
  title,
  description,
  requireComment,
  needsDate,
  lines,
  canEditLines = true,
  submitting,
  dict,
  commonDict,
  onConfirm,
  onCancel,
}: {
  title: string;
  description?: string;
  requireComment: boolean;
  needsDate: boolean;
  // Passing lines turns on the line editor. Approvers may trim quantities or
  // drop lines, as long as one line with a positive quantity survives.
  lines?: NeedRequestLineDto[];
  // Without wh.act.edit.lines the lines still show — an approver should see
  // what they are agreeing to — but nothing about them can be changed. The
  // server enforces it too; this only keeps the UI honest about it.
  canEditLines?: boolean;
  submitting: boolean;
  dict: Dictionary["requestModals"];
  commonDict: Dictionary["common"];
  onConfirm: (body: RequestDecisionBody) => void;
  onCancel: () => void;
}) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  // Includes lines an earlier decision dropped, shown struck through with a
  // restore control. Filtering them out made a first-level deletion final in
  // everything but name: the counter-signer reviews the whole request, and
  // that has to include what was taken out of it.
  const editable = lines ?? [];

  const [comment, setComment] = useState("");
  const [date, setDate] = useState(needsDate ? tomorrow : "");
  const [edits, setEdits] = useState<Record<string, { quantity: number; removed: boolean }>>(() =>
    Object.fromEntries(
      editable.map((line) => [
        line.id,
        { quantity: line.quantityApproved ?? line.quantityRequested, removed: line.removed },
      ])
    )
  );
  const [error, setError] = useState<string | null>(null);

  function setLine(id: string, patch: Partial<{ quantity: number; removed: boolean }>) {
    setEdits((current) => ({ ...current, [id]: { ...current[id]!, ...patch } }));
  }

  function submit() {
    if (requireComment && !comment.trim()) {
      setError(dict.reasonRequired);
      return;
    }
    if (needsDate) {
      if (!date) {
        setError(dict.dateRequired);
        return;
      }
      if (date <= new Date().toISOString().slice(0, 10)) {
        setError(dict.dateRequired);
        return;
      }
    }

    // Compared against the line's current state, not against "untouched": a
    // line that arrives already removed and stays removed is not an edit, but
    // one that arrives removed and leaves restored is.
    const changed = editable
      .map((line) => ({ line, edit: edits[line.id]! }))
      .filter(
        ({ line, edit }) =>
          edit.removed !== line.removed ||
          (!edit.removed && edit.quantity !== (line.quantityApproved ?? line.quantityRequested))
      );

    if (editable.length > 0) {
      const survivors = editable.filter((line) => {
        const edit = edits[line.id]!;
        return !edit.removed && edit.quantity > 0;
      });
      if (survivors.length === 0) {
        setError(dict.keepOneLine);
        return;
      }
    }

    onConfirm({
      comment: comment.trim() || null,
      postponedUntil: needsDate ? date : null,
      lines: changed.map(({ line, edit }) => ({
        lineId: line.id,
        quantity: edit.removed ? null : edit.quantity,
        removed: edit.removed,
      })),
    });
  }

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
          {description && <p className="request-dialog-desc">{description}</p>}

          {needsDate && (
            <div className="field">
              <label htmlFor="decision-date">{dict.postponeUntilLabel}</label>
              <input
                id="decision-date"
                type="date"
                value={date}
                min={tomorrow}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          )}

          {editable.length > 0 && (
            <div className="field">
              <label>{dict.editLines}</label>
              <ul className="decision-lines">
                {editable.map((line) => {
                  const edit = edits[line.id]!;
                  return (
                    <li key={line.id} className={edit.removed ? "decision-line removed" : "decision-line"}>
                      <span className="decision-line-name">{line.itemNameAr}</span>
                      {/* A decision may cut or drop a line, never ask for
                          more than the requester did. */}
                      <input
                        type="number"
                        min={1}
                        max={line.quantityRequested}
                        value={edit.quantity}
                        readOnly={!canEditLines}
                        disabled={edit.removed || !canEditLines}
                        onChange={(event) =>
                          setLine(line.id, {
                            quantity: Math.min(line.quantityRequested, Math.max(0, Number(event.target.value))),
                          })
                        }
                      />
                      {canEditLines && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => setLine(line.id, { removed: !edit.removed })}
                        >
                          {edit.removed ? dict.restoreLine : dict.removeLine}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="field">
            <label htmlFor="decision-comment">
              {dict.commentLabel} {!requireComment && <span className="hint">{dict.commentOptional}</span>}
            </label>
            <textarea
              id="decision-comment"
              value={comment}
              placeholder={dict.commentPlaceholder}
              onChange={(event) => setComment(event.target.value)}
              autoFocus
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
            {title}
          </button>
        </div>
      </div>
    </div>
  );
}
