"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import AttachmentUploader from "@/components/AttachmentUploader";
import { exportToXlsx } from "@/lib/exportXlsx";
import PrintReportHeader from "@/components/PrintReportHeader";
import SectionLoading from "@/components/SectionLoading";
import Toast from "@/components/Toast";
import type { RoomDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

type Edited = { roomNumber: string; nameAr: string; nameEn: string; building: string; floor: string };

export default function RoomAdmin({
  dict,
  attachmentsDict,
  commonDict,
}: {
  dict: Dictionary["rooms"];
  attachmentsDict: Dictionary["attachments"];
  commonDict: Dictionary["common"];
}) {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomDto[] | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [photosOpenFor, setPhotosOpenFor] = useState<string | null>(null);
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newNameAr, setNewNameAr] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [newBuilding, setNewBuilding] = useState("");
  const [newFloor, setNewFloor] = useState("");
  const [editing, setEditing] = useState<Record<string, Edited>>({});
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);

  function load() {
    apiFetch<RoomDto[]>("/rooms")
      .then(setRooms)
      .catch(() => router.replace("/dashboard"));
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load();
    apiFetch<{ permissions: string[] }>("/auth/me")
      .then((me) => setCanManage(me.permissions.includes("as.manage")))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAddSubmitting(true);
    try {
      await apiFetch("/rooms", {
        method: "POST",
        body: JSON.stringify({
          roomNumber: newRoomNumber,
          nameAr: newNameAr,
          nameEn: newNameEn,
          building: newBuilding || null,
          floor: newFloor || null,
          version: null,
        }),
      });
      setNewRoomNumber("");
      setNewNameAr("");
      setNewNameEn("");
      setNewBuilding("");
      setNewFloor("");
      setShowAddModal(false);
      load();
      setToast(commonDict.actionSuccess);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setAddSubmitting(false);
    }
  }

  async function handleUpdate(room: RoomDto) {
    const edited = editing[room.id];
    if (!edited) return;
    setError(null);
    try {
      await apiFetch(`/rooms/${room.id}`, {
        method: "PUT",
        body: JSON.stringify({
          roomNumber: edited.roomNumber,
          nameAr: edited.nameAr,
          nameEn: edited.nameEn,
          building: edited.building || null,
          floor: edited.floor || null,
          version: room.version,
        }),
      });
      load();
      setToast(commonDict.actionSuccess);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  async function handleExport() {
    await exportToXlsx(
      dict.title,
      dict.title,
      [
        { header: dict.roomNumberLabel, value: (r: RoomDto) => r.roomNumber },
        { header: dict.nameArLabel, value: (r: RoomDto) => r.nameAr },
        { header: dict.buildingLabel, value: (r: RoomDto) => r.building ?? "" },
        { header: dict.floorLabel, value: (r: RoomDto) => r.floor ?? "" },
      ],
      rooms ?? []
    );
  }

  if (!rooms) return <SectionLoading />;

  return (
    <>
      <div className="no-print">
        <div className="eyebrow">{dict.title}</div>
        <h1 className="section-title disp">{dict.title}</h1>
      </div>
      <div className="print-only">
        <PrintReportHeader title={dict.title} dict={commonDict} />
      </div>
      {error && (
        <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </p>
      )}

      <div className="panel">
        <div className="panel-head no-print" style={{ justifyContent: "flex-end" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleExport}>
              {commonDict.exportXlsx}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => window.print()}>
              {commonDict.print}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
              {dict.addNew}
            </button>
          </div>
        </div>

        {rooms.length === 0 ? (
          <div className="empty">
            <b>{dict.title}</b>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{dict.roomNumberLabel}</th>
                  <th>{dict.nameArLabel}</th>
                  <th>{dict.nameEnLabel}</th>
                  <th>{dict.buildingLabel}</th>
                  <th>{dict.floorLabel}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => {
                  const edited = editing[room.id] ?? {
                    roomNumber: room.roomNumber,
                    nameAr: room.nameAr,
                    nameEn: room.nameEn,
                    building: room.building ?? "",
                    floor: room.floor ?? "",
                  };
                  return (
                    <>
                      <tr key={room.id}>
                        <td>
                          <input
                            type="text"
                            value={edited.roomNumber}
                            onChange={(e) => setEditing({ ...editing, [room.id]: { ...edited, roomNumber: e.target.value } })}
                            style={{ border: "1.5px solid var(--line)", borderRadius: 8, padding: "6px 9px", width: 90 }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={edited.nameAr}
                            onChange={(e) => setEditing({ ...editing, [room.id]: { ...edited, nameAr: e.target.value } })}
                            style={{ border: "1.5px solid var(--line)", borderRadius: 8, padding: "6px 9px", width: "100%" }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={edited.nameEn}
                            onChange={(e) => setEditing({ ...editing, [room.id]: { ...edited, nameEn: e.target.value } })}
                            style={{ border: "1.5px solid var(--line)", borderRadius: 8, padding: "6px 9px", width: "100%" }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={edited.building}
                            onChange={(e) => setEditing({ ...editing, [room.id]: { ...edited, building: e.target.value } })}
                            style={{ border: "1.5px solid var(--line)", borderRadius: 8, padding: "6px 9px", width: 90 }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={edited.floor}
                            onChange={(e) => setEditing({ ...editing, [room.id]: { ...edited, floor: e.target.value } })}
                            style={{ border: "1.5px solid var(--line)", borderRadius: 8, padding: "6px 9px", width: 70 }}
                          />
                        </td>
                        <td style={{ display: "flex", gap: 6 }}>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => handleUpdate(room)}>
                            {dict.save}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setPhotosOpenFor(photosOpenFor === room.id ? null : room.id)}
                          >
                            {attachmentsDict.title}
                          </button>
                        </td>
                      </tr>
                      {photosOpenFor === room.id && (
                        <tr>
                          <td colSpan={6} style={{ background: "var(--paper-dim)" }}>
                            <AttachmentUploader
                              ownerType="ROOM"
                              ownerId={room.id}
                              dict={attachmentsDict}
                              canManage={canManage}
                              onAction={() => setToast(commonDict.actionSuccess)}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {showAddModal && (
        <div className="overlay no-print" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-head">
              <h3>{dict.addNew}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowAddModal(false)}
                aria-label="close"
                disabled={addSubmitting}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form id="room-add-form" onSubmit={handleCreate} className="form-grid">
                <div className="field">
                  <label>{dict.roomNumberLabel}</label>
                  <input type="text" value={newRoomNumber} onChange={(e) => setNewRoomNumber(e.target.value)} required />
                </div>
                <div className="field">
                  <label>{dict.nameArLabel}</label>
                  <input type="text" value={newNameAr} onChange={(e) => setNewNameAr(e.target.value)} required />
                </div>
                <div className="field">
                  <label>{dict.nameEnLabel}</label>
                  <input type="text" value={newNameEn} onChange={(e) => setNewNameEn(e.target.value)} required />
                </div>
                <div className="field">
                  <label>{dict.buildingLabel}</label>
                  <input type="text" value={newBuilding} onChange={(e) => setNewBuilding(e.target.value)} />
                </div>
                <div className="field">
                  <label>{dict.floorLabel}</label>
                  <input type="text" value={newFloor} onChange={(e) => setNewFloor(e.target.value)} />
                </div>
              </form>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAddModal(false)} disabled={addSubmitting}>
                {commonDict.cancel}
              </button>
              <button type="submit" form="room-add-form" className="btn btn-primary btn-sm" disabled={addSubmitting}>
                {addSubmitting && <span className="spinner" />}
                {dict.addNew}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
