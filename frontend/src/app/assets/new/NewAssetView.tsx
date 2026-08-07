"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { AssetDetail, AssetStatusValue, CategoryDto, RoomDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

export default function NewAssetView({
  dict,
  errorsDict,
}: {
  dict: Dictionary["assets"];
  errorsDict: Dictionary["errors"];
}) {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);
  const [rooms, setRooms] = useState<RoomDto[] | null>(null);
  const [assetNumber, setAssetNumber] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
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
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    Promise.all([apiFetch<CategoryDto[]>("/assets/categories"), apiFetch<RoomDto[]>("/rooms")])
      .then(([c, r]) => {
        setCategories(c);
        setRooms(r);
      })
      .catch(() => router.replace("/assets"));
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await apiFetch<AssetDetail>("/assets", {
        method: "POST",
        body: JSON.stringify({
          assetNumber,
          nameAr,
          nameEn,
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
      router.push(`/assets/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorsDict.generic);
      setSubmitting(false);
    }
  }

  if (!categories || !rooms) return null;

  return (
    <main style={{ maxWidth: 600, margin: "5vh auto", padding: "0 1rem" }}>
      <h1>{dict.addNew}</h1>
      <form onSubmit={handleSubmit}>
        <label>
          {dict.assetNumberLabel}
          <input type="text" value={assetNumber} onChange={(e) => setAssetNumber(e.target.value)} required />
        </label>
        <label>
          {dict.nameArLabel}
          <input type="text" value={nameAr} onChange={(e) => setNameAr(e.target.value)} required />
        </label>
        <label>
          {dict.nameEnLabel}
          <input type="text" value={nameEn} onChange={(e) => setNameEn(e.target.value)} required />
        </label>
        <label>
          {dict.categoryLabel}
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameAr} / {c.nameEn}
              </option>
            ))}
          </select>
        </label>
        <label>
          {dict.roomLabel}
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            <option value="">—</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.roomNumber} — {r.nameAr}
              </option>
            ))}
          </select>
        </label>
        <label>
          {dict.statusLabel}
          <select value={status} onChange={(e) => setStatus(e.target.value as AssetStatusValue)}>
            <option value="ACTIVE">{dict.statusActive}</option>
            <option value="MAINTENANCE">{dict.statusMaintenance}</option>
            <option value="RETIRED">{dict.statusRetired}</option>
          </select>
        </label>
        <label>
          {dict.acquisitionDateLabel}
          <input type="date" value={acquisitionDate} onChange={(e) => setAcquisitionDate(e.target.value)} />
        </label>
        <label>
          {dict.acquisitionCostLabel}
          <input type="number" step="0.01" value={acquisitionCost} onChange={(e) => setAcquisitionCost(e.target.value)} />
        </label>
        <label>
          {dict.vendorLabel}
          <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </label>
        <label>
          {dict.notesLabel}
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {dict.submitCreate}
        </button>
      </form>
    </main>
  );
}
