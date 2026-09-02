"use client";

import { useEffect, useRef, useState } from "react";
import ItemPicker from "@/components/ItemPicker";
import type { Dictionary } from "@/i18n/getDictionary";
import type { InventoryRequestOption, MaintenanceRequestListItem } from "@/lib/types";
import usePagedPickerOptions from "@/lib/usePagedPickerOptions";

type PartDraft = { inventoryItemId: string; quantity: number };

export default function MaintenanceFinishDialog({
  title,
  request,
  submitting,
  dict,
  commonDict,
  loadErrorLabel,
  onConfirm,
  onCancel,
  onLoadError,
}: {
  title: string;
  request: MaintenanceRequestListItem;
  submitting: boolean;
  dict: Dictionary["maintenanceRequests"];
  commonDict: Dictionary["common"];
  loadErrorLabel: string;
  onConfirm: (body: { partsUsed: { inventoryItemId: string; quantity: number }[] }) => void;
  onCancel: () => void;
  onLoadError: (error: unknown) => void;
}) {
  const [drafts, setDrafts] = useState<PartDraft[]>([{ inventoryItemId: "", quantity: 1 }]);
  const onLoadErrorRef = useRef(onLoadError);
  const {
    options: loadedParts,
    knownOptions,
    loading: partsLoading,
    error: partsError,
    search: searchParts,
    remember,
  } = usePagedPickerOptions<InventoryRequestOption>(
    "/maintenance/parts/finish-options?sort=code,asc&sort=id,asc",
    loadErrorLabel,
  );
  const parts = loadedParts?.filter((item) => item.active && item.quantity > 0) ?? null;

  useEffect(() => { onLoadErrorRef.current = onLoadError; }, [onLoadError]);
  useEffect(() => {
    if (partsError) onLoadErrorRef.current(new Error(partsError));
  }, [partsError]);

  function updateDraft(index: number, patch: Partial<PartDraft>) {
    setDrafts((current) => current.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)));
  }

  function submit() {
    onConfirm({
      partsUsed: drafts
        .filter((draft) => draft.inventoryItemId)
        .map((draft) => ({ inventoryItemId: draft.inventoryItemId, quantity: draft.quantity })),
    });
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="maintenance-finish-title">
      <div className="modal wide maintenance-finish-modal">
        <div className="modal-head">
          <h3 id="maintenance-finish-title">{title}</h3>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="close" disabled={submitting}>×</button>
        </div>

        <div className="modal-body">
          <div className="maintenance-finish-summary">
            <strong>{request.faultType?.ar ?? "—"}</strong>
            <span>{request.requesterName}</span>
            {request.department && <span>{request.department.ar}</span>}
            {request.location && <span>{request.location}</span>}
          </div>
          <p className="request-dialog-desc">{dict.partsUsedLabel}</p>

          {parts === null ? (
            <div className="empty"><span className="spinner" /></div>
          ) : partsError ? (
            <p className="form-error" role="alert">{loadErrorLabel}</p>
          ) : (
            <div className="maintenance-finish-lines">
              {drafts.map((draft, index) => {
                const selected = knownOptions[draft.inventoryItemId] ?? null;
                const choices = parts.filter(
                  (part) => part.id === draft.inventoryItemId || !drafts.some((row) => row.inventoryItemId === part.id)
                );
                return (
                  <div className="maintenance-finish-line" key={index}>
                    <div className="field">
                      <label>{dict.itemLabel}</label>
                      <ItemPicker
                        items={choices}
                        value={draft.inventoryItemId}
                        selectedItem={selected}
                        placeholder={dict.itemLabel}
                        emptyLabel={dict.noResults}
                        loadingLabel={commonDict.loading}
                        errorLabel={partsError}
                        clearLabel={`${dict.itemLabel} ×`}
                        loading={partsLoading}
                        onSearchChange={searchParts}
                        onChange={(inventoryItemId, item) => {
                          if (item) remember(item);
                          updateDraft(index, { inventoryItemId, quantity: 1 });
                        }}
                      />
                      {selected && (
                        <small className="hint">
                          {dict.quantityLabel}: {selected.quantity} {selected.unit ?? ""}
                        </small>
                      )}
                    </div>
                    <div className="field maintenance-finish-quantity">
                      <label>{dict.quantityLabel}</label>
                      <input
                        type="number"
                        min={1}
                        max={selected?.quantity}
                        value={draft.quantity}
                        disabled={!draft.inventoryItemId}
                        onChange={(event) => updateDraft(index, {
                          quantity: Math.min(selected?.quantity ?? Number.MAX_SAFE_INTEGER, Math.max(1, Number(event.target.value))),
                        })}
                      />
                    </div>
                    {drafts.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm maintenance-finish-remove"
                        onClick={() => setDrafts((current) => current.filter((_, i) => i !== index))}
                        disabled={submitting}
                        aria-label="remove"
                      >×</button>
                    )}
                  </div>
                );
              })}

              {/* Search is paged, so the current 20 rows cannot prove the
                  catalogue is exhausted. Keep Add available and let the next
                  picker report an honest empty result. */}
              <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setDrafts((current) => [...current, { inventoryItemId: "", quantity: 1 }])}
                  disabled={submitting}
                >
                  {dict.addPart}
                </button>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn btn-outline btn-sm" onClick={onCancel} disabled={submitting}>
            {commonDict.cancel}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={submitting || parts === null || !!partsError}>
            {submitting && <span className="spinner" />}
            {title}
          </button>
        </div>
      </div>
    </div>
  );
}
