"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiFetchBlob, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import AttachmentUploader from "@/components/AttachmentUploader";
import type {
  AssetDetail,
  AssetStatusValue,
  AssetTransferDto,
  CategoryDto,
  EmployeeListItem,
  PagedResponse,
  RoomDto,
} from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

export default function AssetDetailView({
  id,
  dict,
  attachmentsDict,
}: {
  id: string;
  dict: Dictionary["assets"];
  attachmentsDict: Dictionary["attachments"];
}) {
  const router = useRouter();
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);
  const [rooms, setRooms] = useState<RoomDto[] | null>(null);
  const [employees, setEmployees] = useState<EmployeeListItem[] | null>(null);
  const [transfers, setTransfers] = useState<AssetTransferDto[] | null>(null);
  const [canManage, setCanManage] = useState(false);

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<AssetStatusValue>("ACTIVE");
  const [acquisitionDate, setAcquisitionDate] = useState("");
  const [acquisitionCost, setAcquisitionCost] = useState("");
  const [vendor, setVendor] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [transferRoomId, setTransferRoomId] = useState("");
  const [transferEmployeeId, setTransferEmployeeId] = useState("");
  const [transferReason, setTransferReason] = useState("");

  function load() {
    apiFetch<AssetDetail>(`/assets/${id}`)
      .then((a) => {
        setAsset(a);
        setNameAr(a.nameAr);
        setNameEn(a.nameEn);
        setCategoryId(a.category?.id ?? "");
        setStatus(a.status);
        setAcquisitionDate(a.acquisitionDate ?? "");
        setAcquisitionCost(a.acquisitionCost != null ? String(a.acquisitionCost) : "");
        setVendor(a.vendor ?? "");
        setNotes(a.notes ?? "");
      })
      .catch(() => router.replace("/assets"));
    apiFetch<AssetTransferDto[]>(`/assets/${id}/transfers`)
      .then(setTransfers)
      .catch(() => {});
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load();
    apiFetch<CategoryDto[]>("/assets/categories").then(setCategories).catch(() => {});
    apiFetch<RoomDto[]>("/rooms").then(setRooms).catch(() => {});
    apiFetch<PagedResponse<EmployeeListItem>>("/employees?size=200")
      .then((p) => setEmployees(p.content))
      .catch(() => setEmployees([]));
    apiFetch<{ permissions: string[] }>("/auth/me")
      .then((me) => setCanManage(me.permissions.includes("as.manage")))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, id]);

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!asset) return;
    setError(null);
    try {
      await apiFetch(`/assets/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          nameAr,
          nameEn,
          categoryId: categoryId || null,
          status,
          acquisitionDate: acquisitionDate || null,
          acquisitionCost: acquisitionCost ? Number(acquisitionCost) : null,
          vendor: vendor || null,
          notes: notes || null,
          version: asset.version,
        }),
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  async function handleTransfer(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch(`/assets/${id}/transfers`, {
        method: "POST",
        body: JSON.stringify({
          toRoomId: transferRoomId || null,
          toEmployeeId: transferEmployeeId || null,
          reason: transferReason || null,
        }),
      });
      setTransferRoomId("");
      setTransferEmployeeId("");
      setTransferReason("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  async function downloadQr() {
    const blob = await apiFetchBlob(`/assets/${id}/qr`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${asset?.assetNumber ?? "asset"}-qr.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!asset || !categories || !rooms) return null;

  return (
    <main style={{ maxWidth: 700, margin: "5vh auto", padding: "0 1rem" }}>
      <h1>
        {asset.assetNumber} — {asset.nameAr}
      </h1>
      {error && <p role="alert">{error}</p>}

      <button type="button" onClick={downloadQr}>
        {dict.downloadQr}
      </button>

      <form onSubmit={handleUpdate}>
        <label>
          {dict.nameArLabel}
          <input type="text" value={nameAr} onChange={(e) => setNameAr(e.target.value)} required disabled={!canManage} />
        </label>
        <label>
          {dict.nameEnLabel}
          <input type="text" value={nameEn} onChange={(e) => setNameEn(e.target.value)} required disabled={!canManage} />
        </label>
        <label>
          {dict.categoryLabel}
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={!canManage}>
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameAr} / {c.nameEn}
              </option>
            ))}
          </select>
        </label>
        <label>
          {dict.statusLabel}
          <select value={status} onChange={(e) => setStatus(e.target.value as AssetStatusValue)} disabled={!canManage}>
            <option value="ACTIVE">{dict.statusActive}</option>
            <option value="MAINTENANCE">{dict.statusMaintenance}</option>
            <option value="RETIRED">{dict.statusRetired}</option>
          </select>
        </label>
        <label>
          {dict.acquisitionDateLabel}
          <input
            type="date"
            value={acquisitionDate}
            onChange={(e) => setAcquisitionDate(e.target.value)}
            disabled={!canManage}
          />
        </label>
        <label>
          {dict.acquisitionCostLabel}
          <input
            type="number"
            step="0.01"
            value={acquisitionCost}
            onChange={(e) => setAcquisitionCost(e.target.value)}
            disabled={!canManage}
          />
        </label>
        <label>
          {dict.vendorLabel}
          <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} disabled={!canManage} />
        </label>
        <label>
          {dict.notesLabel}
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!canManage} />
        </label>
        <p>
          {dict.roomLabel}: {asset.room ? asset.room.ar : "—"}
        </p>
        <p>
          {dict.custodianLabel}: {asset.custodianName ?? "—"}
        </p>

        {canManage && <button type="submit">{dict.submitUpdate}</button>}
      </form>

      {canManage && (
        <form onSubmit={handleTransfer}>
          <h2>{dict.transferButton}</h2>
          <label>
            {dict.roomLabel}
            <select value={transferRoomId} onChange={(e) => setTransferRoomId(e.target.value)}>
              <option value="">—</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} — {r.nameAr}
                </option>
              ))}
            </select>
          </label>
          <label>
            {dict.custodianLabel}
            <select value={transferEmployeeId} onChange={(e) => setTransferEmployeeId(e.target.value)}>
              <option value="">—</option>
              {(employees ?? []).map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {dict.notesLabel}
            <input type="text" value={transferReason} onChange={(e) => setTransferReason(e.target.value)} />
          </label>
          <button type="submit">{dict.transferButton}</button>
        </form>
      )}

      <AttachmentUploader ownerType="ASSET" ownerId={asset.id} dict={attachmentsDict} canManage={canManage} />

      <h2>{dict.transferHistory}</h2>
      {transfers && transfers.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>{dict.roomLabel}</th>
              <th>{dict.custodianLabel}</th>
              <th>{dict.notesLabel}</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t, i) => (
              <tr key={i}>
                <td>{t.toRoom ? t.toRoom.ar : "—"}</td>
                <td>{t.toEmployeeName ?? "—"}</td>
                <td>{t.reason ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
