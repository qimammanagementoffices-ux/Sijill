"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import AttachmentUploader from "@/components/AttachmentUploader";
import type { RoomDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

type Edited = { roomNumber: string; nameAr: string; nameEn: string; building: string; floor: string };

export default function RoomAdmin({
  dict,
  attachmentsDict,
}: {
  dict: Dictionary["rooms"];
  attachmentsDict: Dictionary["attachments"];
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
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  if (!rooms) return null;

  return (
    <main style={{ maxWidth: 700, margin: "5vh auto", padding: "0 1rem" }}>
      <h1>{dict.title}</h1>
      {error && <p role="alert">{error}</p>}

      <ul>
        {rooms.map((room) => {
          const edited = editing[room.id] ?? {
            roomNumber: room.roomNumber,
            nameAr: room.nameAr,
            nameEn: room.nameEn,
            building: room.building ?? "",
            floor: room.floor ?? "",
          };
          return (
            <li key={room.id}>
              <input
                type="text"
                value={edited.roomNumber}
                onChange={(e) => setEditing({ ...editing, [room.id]: { ...edited, roomNumber: e.target.value } })}
              />
              <input
                type="text"
                value={edited.nameAr}
                onChange={(e) => setEditing({ ...editing, [room.id]: { ...edited, nameAr: e.target.value } })}
              />
              <input
                type="text"
                value={edited.nameEn}
                onChange={(e) => setEditing({ ...editing, [room.id]: { ...edited, nameEn: e.target.value } })}
              />
              <input
                type="text"
                value={edited.building}
                onChange={(e) => setEditing({ ...editing, [room.id]: { ...edited, building: e.target.value } })}
              />
              <input
                type="text"
                value={edited.floor}
                onChange={(e) => setEditing({ ...editing, [room.id]: { ...edited, floor: e.target.value } })}
              />
              <button type="button" onClick={() => handleUpdate(room)}>
                {dict.save}
              </button>
              <button
                type="button"
                onClick={() => setPhotosOpenFor(photosOpenFor === room.id ? null : room.id)}
              >
                {attachmentsDict.title}
              </button>
              {photosOpenFor === room.id && (
                <AttachmentUploader ownerType="ROOM" ownerId={room.id} dict={attachmentsDict} canManage={canManage} />
              )}
            </li>
          );
        })}
      </ul>

      <form onSubmit={handleCreate}>
        <label>
          {dict.roomNumberLabel}
          <input type="text" value={newRoomNumber} onChange={(e) => setNewRoomNumber(e.target.value)} required />
        </label>
        <label>
          {dict.nameArLabel}
          <input type="text" value={newNameAr} onChange={(e) => setNewNameAr(e.target.value)} required />
        </label>
        <label>
          {dict.nameEnLabel}
          <input type="text" value={newNameEn} onChange={(e) => setNewNameEn(e.target.value)} required />
        </label>
        <label>
          {dict.buildingLabel}
          <input type="text" value={newBuilding} onChange={(e) => setNewBuilding(e.target.value)} />
        </label>
        <label>
          {dict.floorLabel}
          <input type="text" value={newFloor} onChange={(e) => setNewFloor(e.target.value)} />
        </label>
        <button type="submit">{dict.addNew}</button>
      </form>
    </main>
  );
}
