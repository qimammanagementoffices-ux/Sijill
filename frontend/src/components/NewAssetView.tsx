"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";
import TrilingualNameFields from "@/components/TrilingualNameFields";
import type { AssetDetail, AssetStatusValue, CategoryDto, RoomDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";

export default function NewAssetView({
  dict,
  errorsDict,
  categoriesModalDict,
  onSubmitted,
  formId,
  onSubmittingChange,
}: {
  dict: Dictionary["assets"];
  errorsDict: Dictionary["errors"];
  categoriesModalDict: Dictionary["categoriesModal"];
  onSubmitted: (asset: AssetDetail) => void;
  // When set, the submit button renders externally (via
  // <button form={formId}>) instead of inline -- used inside a modal,
  // same pattern as EmployeeForm.
  formId?: string;
  onSubmittingChange?: (submitting: boolean) => void;
}) {
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);
  const [rooms, setRooms] = useState<RoomDto[] | null>(null);
  // No assetNumber field: the server assigns AST-#### from a sequence.
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameHi, setNameHi] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [status, setStatus] = useState<AssetStatusValue>("ACTIVE");
  const [acquisitionDate, setAcquisitionDate] = useState("");
  const [acquisitionCost, setAcquisitionCost] = useState("");
  const [vendor, setVendor] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([apiFetch<CategoryDto[]>("/assets/categories"), apiFetch<RoomDto[]>("/rooms")]).then(([c, r]) => {
      setCategories(c);
      setRooms(r);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onSubmittingChange?.(submitting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitting]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await apiFetch<AssetDetail>("/assets", {
        method: "POST",
        body: JSON.stringify({
          nameAr,
          nameEn,
          nameHi: nameHi || null,
          categoryId: categoryId || null,
          roomId: roomId || null,
          custodianId: null,
          status,
          acquisitionDate: acquisitionDate || null,
          acquisitionCost: acquisitionCost ? Number(acquisitionCost) : null,
          vendor: vendor || null,
          notes: notes || null,
        }),
      });
      onSubmitted(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorsDict.generic);
      setSubmitting(false);
    }
  }

  if (!categories || !rooms) return <SectionLoading />;

  return (
    <form id={formId} onSubmit={handleSubmit}>
      <div className="panel">
        <div className="panel-body">
          <div className="form-grid">
            <TrilingualNameFields
              nameAr={nameAr}
              setNameAr={setNameAr}
              nameEn={nameEn}
              setNameEn={setNameEn}
              nameHi={nameHi}
              setNameHi={setNameHi}
              dict={categoriesModalDict}
              errorsDict={errorsDict}
            />
            <div className="field">
              <label>{dict.categoryLabel}</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr} / {c.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{dict.roomLabel}</label>
              <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                <option value="">—</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roomNumber} — {r.nameAr}
                  </option>
                ))}
              </select>
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
            <div className="field span2">
              <label>{dict.notesLabel}</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </p>
      )}
      {!formId && (
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting && <span className="spinner" />}
          {dict.submitCreate}
        </button>
      )}
    </form>
  );
}
