"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiFetchBlob, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import AttachmentUploader from "@/components/AttachmentUploader";
import SectionLoading from "@/components/SectionLoading";
import Toast from "@/components/Toast";
import TrilingualNameFields from "@/components/TrilingualNameFields";
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

const STATUS_CHIP_CLASS: Record<string, string> = {
  ACTIVE: "s-approved",
  MAINTENANCE: "s-pending",
  RETIRED: "s-postponed",
};

export default function AssetDetailView({
  id,
  dict,
  attachmentsDict,
  commonDict,
  categoriesModalDict,
  errorsDict,
}: {
  id: string;
  dict: Dictionary["assets"];
  attachmentsDict: Dictionary["attachments"];
  commonDict: Dictionary["common"];
  categoriesModalDict: Dictionary["categoriesModal"];
  errorsDict: Dictionary["errors"];
}) {
  const router = useRouter();
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);
  const [rooms, setRooms] = useState<RoomDto[] | null>(null);
  const [employees, setEmployees] = useState<EmployeeListItem[] | null>(null);
  const [transfers, setTransfers] = useState<AssetTransferDto[] | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameUr, setNameUr] = useState("");
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
        setNameUr(a.nameUr ?? "");
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
          nameUr: nameUr || null,
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
      setToast(commonDict.actionSuccess);
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
      setToast(commonDict.actionSuccess);
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

  if (!asset || !categories || !rooms) return <SectionLoading />;

  return (
    <>
      <div className="eyebrow">{dict.title}</div>
      <h1 className="section-title disp">
        <span className="mono" style={{ fontSize: 18, color: "var(--slate)" }}>
          {asset.assetNumber}
        </span>{" "}
        — {asset.nameAr}
      </h1>
      <div style={{ marginBottom: 14 }}>
        <span className={`chip ${STATUS_CHIP_CLASS[asset.status] ?? ""}`}>
          <span className="chip-dot" />
          {{ ACTIVE: dict.statusActive, MAINTENANCE: dict.statusMaintenance, RETIRED: dict.statusRetired }[asset.status]}
        </span>
      </div>
      {error && (
        <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </p>
      )}

      <button type="button" className="btn btn-outline btn-sm" style={{ marginBottom: 18 }} onClick={downloadQr}>
        {dict.downloadQr}
      </button>

      <form onSubmit={handleUpdate}>
        <div className="panel">
          <div className="panel-body">
            <div className="form-grid">
              <TrilingualNameFields
                nameAr={nameAr}
                setNameAr={setNameAr}
                nameEn={nameEn}
                setNameEn={setNameEn}
                nameUr={nameUr}
                setNameUr={setNameUr}
                dict={categoriesModalDict}
                errorsDict={errorsDict}
              />
              <div className="field">
                <label>{dict.categoryLabel}</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={!canManage}>
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr} / {c.nameEn}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>{dict.statusLabel}</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as AssetStatusValue)} disabled={!canManage}>
                  <option value="ACTIVE">{dict.statusActive}</option>
                  <option value="MAINTENANCE">{dict.statusMaintenance}</option>
                  <option value="RETIRED">{dict.statusRetired}</option>
                </select>
              </div>
              <div className="field">
                <label>{dict.acquisitionDateLabel}</label>
                <input
                  type="date"
                  value={acquisitionDate}
                  onChange={(e) => setAcquisitionDate(e.target.value)}
                  disabled={!canManage}
                />
              </div>
              <div className="field">
                <label>{dict.acquisitionCostLabel}</label>
                <input
                  type="number"
                  step="0.01"
                  value={acquisitionCost}
                  onChange={(e) => setAcquisitionCost(e.target.value)}
                  disabled={!canManage}
                />
              </div>
              <div className="field">
                <label>{dict.vendorLabel}</label>
                <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} disabled={!canManage} />
              </div>
              <div className="field span2">
                <label>{dict.notesLabel}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!canManage} />
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--slate)", marginTop: 14, marginBottom: 0 }}>
              {dict.roomLabel}: {asset.room ? asset.room.ar : "—"} · {dict.custodianLabel}: {asset.custodianName ?? "—"}
            </p>
          </div>
          {canManage && (
            <div className="panel-body" style={{ borderTop: "1px solid var(--line-soft)" }}>
              <button type="submit" className="btn btn-primary btn-sm">
                {dict.submitUpdate}
              </button>
            </div>
          )}
        </div>
      </form>

      {canManage && (
        <form onSubmit={handleTransfer}>
          <div className="panel">
            <div className="panel-head">
              <h3>{dict.transferButton}</h3>
            </div>
            <div className="panel-body">
              <div className="form-grid">
                <div className="field">
                  <label>{dict.roomLabel}</label>
                  <select value={transferRoomId} onChange={(e) => setTransferRoomId(e.target.value)}>
                    <option value="">—</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roomNumber} — {r.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>{dict.custodianLabel}</label>
                  <select value={transferEmployeeId} onChange={(e) => setTransferEmployeeId(e.target.value)}>
                    <option value="">—</option>
                    {(employees ?? []).map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field span2">
                  <label>{dict.notesLabel}</label>
                  <input type="text" value={transferReason} onChange={(e) => setTransferReason(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="btn btn-outline btn-sm" style={{ marginTop: 10 }}>
                {dict.transferButton}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="panel">
        <AttachmentUploader
          ownerType="ASSET"
          ownerId={asset.id}
          dict={attachmentsDict}
          canManage={canManage}
          onAction={() => setToast(commonDict.actionSuccess)}
        />
      </div>

      {transfers && transfers.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <h3>{dict.transferHistory}</h3>
          </div>
          <div className="table-scroll">
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
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
