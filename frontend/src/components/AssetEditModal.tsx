"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";
import AttachmentUploader from "@/components/AttachmentUploader";
import SectionLoading from "@/components/SectionLoading";
import TrilingualNameFields from "@/components/TrilingualNameFields";
import type {
  AssetDetail,
  AssetStatusValue,
  CategoryDto,
} from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

export default function AssetEditModal({
  assetId,
  dict,
  attachmentsDict,
  commonDict,
  categoriesModalDict,
  errorsDict,
  onClose,
  onSaved,
  onDeleted,
}: {
  assetId: string;
  dict: Dictionary["assets"];
  attachmentsDict: Dictionary["attachments"];
  commonDict: Dictionary["common"];
  categoriesModalDict: Dictionary["categoriesModal"];
  errorsDict: Dictionary["errors"];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameHi, setNameHi] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<AssetStatusValue>("ACTIVE");
  const [acquisitionDate, setAcquisitionDate] = useState("");
  const [acquisitionCost, setAcquisitionCost] = useState("");
  const [vendor, setVendor] = useState("");
  const [notes, setNotes] = useState("");
  const [depreciationRate, setDepreciationRate] = useState("");
  const [accumulatedDepreciation, setAccumulatedDepreciation] = useState("");
  const [periodEndDate, setPeriodEndDate] = useState("");
  const [periodEndBalance, setPeriodEndBalance] = useState("");

  useEffect(() => {
    apiFetch<AssetDetail>(`/assets/${assetId}`).then((a) => {
      setAsset(a);
      setNameAr(a.nameAr);
      setNameEn(a.nameEn);
      setNameHi(a.nameHi ?? "");
      setCategoryId(a.category?.id ?? "");
      setStatus(a.status);
      setAcquisitionDate(a.acquisitionDate ?? "");
      setAcquisitionCost(a.acquisitionCost != null ? String(a.acquisitionCost) : "");
      setVendor(a.vendor ?? "");
      setNotes(a.notes ?? "");
      setDepreciationRate(a.depreciationRate != null ? String(a.depreciationRate) : "");
      setAccumulatedDepreciation(a.accumulatedDepreciation != null ? String(a.accumulatedDepreciation) : "");
      setPeriodEndDate(a.periodEndDate ?? "");
      setPeriodEndBalance(a.periodEndBalance != null ? String(a.periodEndBalance) : "");
    }).catch(() => onClose());
    apiFetch<CategoryDto[]>("/assets/categories").then(setCategories).catch(() => setCategories([]));
  }, [assetId, onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!asset) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/assets/${assetId}`, {
        method: "PUT",
        body: JSON.stringify({
          nameAr,
          nameEn,
          nameHi: nameHi || null,
          categoryId: categoryId || null,
          status,
          acquisitionDate: acquisitionDate || null,
          acquisitionCost: acquisitionCost ? Number(acquisitionCost) : null,
          vendor: vendor || null,
          notes: notes || null,
          depreciationRate: depreciationRate ? Number(depreciationRate) : null,
          accumulatedDepreciation: accumulatedDepreciation ? Number(accumulatedDepreciation) : null,
          periodEndDate: periodEndDate || null,
          periodEndBalance: periodEndBalance ? Number(periodEndBalance) : null,
          version: asset.version,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm(dict.deleteAsset + "?")) return;
    try {
      await apiFetch(`/assets/${assetId}`, { method: "DELETE" });
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="modal wide">
        <button type="button" className="modal-close" onClick={onClose} aria-label="close">×</button>
        <div className="modal-head">
          <h3>{dict.editAsset}{asset ? ` — ${asset.assetNumber}` : ""}</h3>
        </div>
        <div className="modal-body">
          {!asset || !categories ? (
            <SectionLoading />
          ) : (
            <form id="asset-edit-modal-form" onSubmit={handleSubmit}>
              {error && (
                <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, marginBottom: 12 }}>
                  {error}
                </p>
              )}
              <div className="form-grid">
                <div className="field">
                  <label>{dict.assetNumberLabel}</label>
                  <input type="text" value={asset.assetNumber} disabled />
                </div>
                <TrilingualNameFields
                  nameAr={nameAr} setNameAr={setNameAr}
                  nameEn={nameEn} setNameEn={setNameEn}
                  nameHi={nameHi} setNameHi={setNameHi}
                  dict={categoriesModalDict}
                  errorsDict={errorsDict}
                />
                <div className="field">
                  <label>{dict.categoryLabel}</label>
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">—</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.nameAr} / {c.nameEn}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>{dict.roomLabel}</label>
                  <input type="text" value={asset.room ? `${asset.room.ar}` : "—"} disabled />
                </div>
                <div className="field">
                  <label>{dict.statusLabel}</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as AssetStatusValue)}>
                    <option value="ACTIVE">{dict.statusActive}</option>
                    <option value="MAINTENANCE">{dict.statusMaintenance}</option>
                    <option value="RETIRED">{dict.statusRetired}</option>
                  </select>
                </div>
                <div className="field">
                  <label>{dict.acquisitionDateLabel}</label>
                  <input type="date" value={acquisitionDate} onChange={(e) => setAcquisitionDate(e.target.value)} />
                </div>
                <div className="field">
                  <label>{dict.acquisitionCostLabel}</label>
                  <input type="number" step="0.01" value={acquisitionCost} onChange={(e) => setAcquisitionCost(e.target.value)} />
                </div>
                <div className="field">
                  <label>{dict.vendorLabel}</label>
                  <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} />
                </div>
                <div className="field">
                  <label>{dict.depreciationRateLabel}</label>
                  <input type="number" step="0.01" value={depreciationRate} onChange={(e) => setDepreciationRate(e.target.value)} />
                </div>
                <div className="field">
                  <label>{dict.accumulatedDepreciationLabel}</label>
                  <input type="number" step="0.01" value={accumulatedDepreciation} onChange={(e) => setAccumulatedDepreciation(e.target.value)} />
                </div>
                <div className="field">
                  <label>{dict.periodEndDateLabel}</label>
                  <input type="date" value={periodEndDate} onChange={(e) => setPeriodEndDate(e.target.value)} />
                </div>
                <div className="field">
                  <label>{dict.periodEndBalanceLabel}</label>
                  <input type="number" step="0.01" value={periodEndBalance} onChange={(e) => setPeriodEndBalance(e.target.value)} />
                </div>
                <div className="field span2">
                  <label>{dict.notesLabel}</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <label style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 8, display: "block" }}>
                  {dict.photoUploadLabel}
                </label>
                <AttachmentUploader
                  ownerType="ASSET"
                  ownerId={assetId}
                  dict={attachmentsDict}
                  canManage={true}
                  onAction={() => {}}
                />
              </div>
            </form>
          )}
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-outline btn-sm" style={{ color: "var(--seal)" }} onClick={handleDelete} disabled={submitting}>
            {dict.deleteAsset}
          </button>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose} disabled={submitting}>
            {commonDict.cancel}
          </button>
          <button type="submit" form="asset-edit-modal-form" className="btn btn-primary btn-sm" disabled={submitting}>
            {submitting && <span className="spinner" />}
            {dict.saveChanges}
          </button>
        </div>
      </div>
    </div>
  );
}
