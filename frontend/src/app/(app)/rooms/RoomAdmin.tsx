"use client";

import { entityName, useEntityLocale } from "@/i18n/entityName";
import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import AttachmentUploader from "@/components/AttachmentUploader";
import { exportToXlsx } from "@/lib/exportXlsx";
import { fetchAllPaged } from "@/lib/fetchAllPaged";
import PrintReportHeader from "@/components/PrintReportHeader";
import SectionLoading from "@/components/SectionLoading";
import Toast from "@/components/Toast";
import TrilingualNameFields from "@/components/TrilingualNameFields";
import TableFooter from "@/components/TableFooter";
import type { EmployeeListItem, LocalizedEntityDto, PagedResponse, RoomDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

type Edited = {
  roomNumber: string;
  nameAr: string;
  nameEn: string;
  nameHi: string;
  building: string;
  floor: string;
  departmentId: string;
  custodianId: string;
};

type Sort = { field: string; dir: "asc" | "desc" };

export default function RoomAdmin({
  dict,
  attachmentsDict,
  commonDict,
  categoriesModalDict,
  errorsDict,
}: {
  dict: Dictionary["rooms"];
  attachmentsDict: Dictionary["attachments"];
  commonDict: Dictionary["common"];
  categoriesModalDict: Dictionary["categoriesModal"];
  errorsDict: Dictionary["errors"];
}) {
  const entityLocale = useEntityLocale();
  const router = useRouter();
  const [page, setPage] = useState<PagedResponse<RoomDto> | null>(null);
  const [q, setQ] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [sort, setSort] = useState<Sort>({ field: "roomNumber", dir: "asc" });
  const [size, setSize] = useState(10);
  const [loadingPage, setLoadingPage] = useState<number | null>(null);
  const [printRows, setPrintRows] = useState<RoomDto[] | null>(null);
  const requestSequence = useRef(0);
  const [canManage, setCanManage] = useState(false);
  const [photosOpenFor, setPhotosOpenFor] = useState<string | null>(null);
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newNameAr, setNewNameAr] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [newNameHi, setNewNameHi] = useState("");
  const [newBuilding, setNewBuilding] = useState("");
  const [newFloor, setNewFloor] = useState("");
  const [newDepartmentId, setNewDepartmentId] = useState("");
  const [newCustodianId, setNewCustodianId] = useState("");
  const [editing, setEditing] = useState<Record<string, Edited>>({});
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [departments, setDepartments] = useState<LocalizedEntityDto[] | null>(null);
  const [employees, setEmployees] = useState<EmployeeListItem[] | null>(null);

  function queryString(
    pageNumber: number,
    query: string,
    departmentId: string,
    sortBy: Sort,
    perPage: number
  ) {
    const params = new URLSearchParams({ page: String(pageNumber), size: String(perPage) });
    params.append("sort", `${sortBy.field},${sortBy.dir}`);
    params.append("sort", "id,asc");
    if (query) params.set("q", query);
    if (departmentId) params.set("departmentId", departmentId);
    return `?${params.toString()}`;
  }

  function load(
    pageNumber = 0,
    query = appliedQuery,
    departmentId = departmentFilter,
    sortBy = sort,
    perPage = size
  ) {
    const sequence = ++requestSequence.current;
    setLoadingPage(pageNumber);
    apiFetch<PagedResponse<RoomDto>>(`/rooms/search${queryString(pageNumber, query, departmentId, sortBy, perPage)}`)
      .then((nextPage) => {
        if (sequence === requestSequence.current) setPage(nextPage);
      })
      .catch(() => router.replace("/dashboard"))
      .finally(() => {
        if (sequence === requestSequence.current) setLoadingPage(null);
      });
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load(0, "", "");
    apiFetch<{ permissions: string[] }>("/auth/me")
      .then((me) => setCanManage(me.permissions.includes("as.manage")))
      .catch(() => {});
    Promise.all([
      apiFetch<LocalizedEntityDto[]>("/departments"),
      apiFetch<PagedResponse<EmployeeListItem>>("/employees?size=200"),
    ]).then(([d, e]) => {
      setDepartments(d);
      setEmployees(e.content);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function openAddModal() {
    setShowAddModal(true);
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setAppliedQuery(q);
    load(0, q);
  }

  function applyDepartmentFilter(departmentId: string) {
    setDepartmentFilter(departmentId);
    load(0, appliedQuery, departmentId);
  }

  function clearFilters() {
    setQ("");
    setAppliedQuery("");
    setDepartmentFilter("");
    load(0, "", "");
  }

  function toggleSort(field: string) {
    const next: Sort =
      sort.field === field ? { field, dir: sort.dir === "asc" ? "desc" : "asc" } : { field, dir: "asc" };
    setSort(next);
    load(0, appliedQuery, departmentFilter, next);
  }

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
          nameHi: newNameHi || null,
          building: newBuilding || null,
          floor: newFloor || null,
          departmentId: newDepartmentId || null,
          custodianId: newCustodianId || null,
          version: null,
        }),
      });
      setNewRoomNumber("");
      setNewNameAr("");
      setNewNameEn("");
      setNewNameHi("");
      setNewBuilding("");
      setNewFloor("");
      setNewDepartmentId("");
      setNewCustodianId("");
      setShowAddModal(false);
      load(0);
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
          nameHi: edited.nameHi || null,
          building: edited.building || null,
          floor: edited.floor || null,
          departmentId: edited.departmentId || null,
          custodianId: edited.custodianId || null,
          version: room.version,
        }),
      });
      load(page?.page ?? 0);
      setToast(commonDict.actionSuccess);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  async function handleExport() {
    const rooms = await fetchAllPaged<RoomDto>((pageNumber) =>
      `/rooms/search${queryString(pageNumber, appliedQuery, departmentFilter, sort, 100)}`
    );
    await exportToXlsx(
      dict.title,
      dict.title,
      [
        { header: dict.roomNumberLabel, value: (r: RoomDto) => r.roomNumber },
        { header: dict.nameArLabel, value: (r: RoomDto) => r.nameAr },
        { header: dict.buildingLabel, value: (r: RoomDto) => r.building ?? "" },
        { header: dict.floorLabel, value: (r: RoomDto) => r.floor ?? "" },
        { header: dict.departmentLabel, value: (r: RoomDto) => r.departmentNameAr ?? "" },
        { header: dict.custodianLabel, value: (r: RoomDto) => r.custodianName ?? "" },
        { header: dict.assetCountLabel, value: (r: RoomDto) => r.assetCount },
      ],
      rooms
    );
  }

  async function handlePrint() {
    const rooms = await fetchAllPaged<RoomDto>((pageNumber) =>
      `/rooms/search${queryString(pageNumber, appliedQuery, departmentFilter, sort, 100)}`
    );
    setPrintRows(rooms);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    window.print();
    setPrintRows(null);
  }

  if (!page) return <SectionLoading />;

  const rooms = printRows ?? page.content;
  const filtersActive = appliedQuery !== "" || departmentFilter !== "";

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
        <div className="panel-head no-print">
          <form onSubmit={handleSearch} className="filter-row" style={{ flex: 1 }}>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={dict.searchPlaceholder}
              style={{ border: "1.5px solid var(--line)", borderRadius: 9, padding: "8px 12px", flex: 1, maxWidth: 280 }}
            />
            <select
              value={departmentFilter}
              onChange={(e) => applyDepartmentFilter(e.target.value)}
              style={{ border: "1.5px solid var(--line)", borderRadius: 9, padding: "8px 12px" }}
            >
              <option value="">{dict.filterAllDepartments}</option>
              {(departments ?? []).map((department) => (
                <option key={department.id} value={department.id}>
                  {entityName(department, entityLocale)}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-outline btn-sm">{dict.search}</button>
            {filtersActive && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters} aria-label="clear">×</button>
            )}
          </form>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleExport}>
              {commonDict.exportXlsx}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => void handlePrint()}>
              {commonDict.print}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={openAddModal}>
              {dict.addNew}
            </button>
          </div>
        </div>

        {rooms.length === 0 ? (
          <div className="empty">
            <b>{dict.noResults}</b>
          </div>
        ) : (
          <div className="table-scroll table-loading-wrap">
            {loadingPage !== null && (
              <div className="table-loading-veil no-print"><span className="spinner spinner-lg" /></div>
            )}
            <table>
              <thead>
                <tr>
                  {([
                    ["roomNumber", dict.roomNumberLabel],
                    ["nameAr", dict.nameArLabel],
                    ["nameHi", dict.nameHiLabel],
                    ["nameEn", dict.nameEnLabel],
                    ["building", dict.buildingLabel],
                    ["floor", dict.floorLabel],
                    ["department.nameAr", dict.departmentLabel],
                    ["custodian.name", dict.custodianLabel],
                  ] as const).map(([field, label]) => (
                    <th key={field}>
                      <button type="button" className="th-sort" onClick={() => toggleSort(field)}>
                        {label}
                        <span className="th-sort-arrow">{sort.field === field ? (sort.dir === "asc" ? "▲" : "▼") : ""}</span>
                      </button>
                    </th>
                  ))}
                  <th>{dict.assetCountLabel}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => {
                  const edited = editing[room.id] ?? {
                    roomNumber: room.roomNumber,
                    nameAr: room.nameAr,
                    nameEn: room.nameEn,
                    nameHi: room.nameHi ?? "",
                    building: room.building ?? "",
                    floor: room.floor ?? "",
                    departmentId: room.departmentId ?? "",
                    custodianId: room.custodianId ?? "",
                  };
                  return (
                    <Fragment key={room.id}>
                      <tr>
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
                            dir="rtl"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={edited.nameHi}
                            onChange={(e) => setEditing({ ...editing, [room.id]: { ...edited, nameHi: e.target.value } })}
                            style={{ border: "1.5px solid var(--line)", borderRadius: 8, padding: "6px 9px", width: "100%" }}
                            dir="rtl"
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
                        <td>
                          <select
                            value={edited.departmentId}
                            onChange={(e) => setEditing({ ...editing, [room.id]: { ...edited, departmentId: e.target.value } })}
                          >
                            <option value="">—</option>
                            {(departments ?? []).map((d) => (
                              <option key={d.id} value={d.id}>
                                {entityName(d, entityLocale)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            value={edited.custodianId}
                            onChange={(e) => setEditing({ ...editing, [room.id]: { ...edited, custodianId: e.target.value } })}
                          >
                            <option value="">—</option>
                            {(employees ?? []).map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <span className="count-badge">{room.assetCount}</span>
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
                          <td colSpan={10} style={{ background: "var(--paper-dim)" }}>
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
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <TableFooter
          page={page.page}
          totalPages={page.totalPages}
          size={size}
          loadingPage={loadingPage}
          rowsPerPageLabel={commonDict.rowsPerPage}
          onPage={(pageNumber) => load(pageNumber)}
          onSize={(next) => {
            setSize(next);
            load(0, appliedQuery, departmentFilter, sort, next);
          }}
        />

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
                <TrilingualNameFields
                  nameAr={newNameAr}
                  setNameAr={setNewNameAr}
                  nameEn={newNameEn}
                  setNameEn={setNewNameEn}
                  nameHi={newNameHi}
                  setNameHi={setNewNameHi}
                  dict={categoriesModalDict}
                  errorsDict={errorsDict}
                />
                <div className="field">
                  <label>{dict.buildingLabel}</label>
                  <input type="text" value={newBuilding} onChange={(e) => setNewBuilding(e.target.value)} />
                </div>
                <div className="field">
                  <label>{dict.floorLabel}</label>
                  <input type="text" value={newFloor} onChange={(e) => setNewFloor(e.target.value)} />
                </div>
                <div className="field">
                  <label>{dict.departmentLabel}</label>
                  <select value={newDepartmentId} onChange={(e) => setNewDepartmentId(e.target.value)}>
                    <option value="">—</option>
                    {(departments ?? []).map((d) => (
                      <option key={d.id} value={d.id}>
                        {entityName(d, entityLocale)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>{dict.custodianLabel}</label>
                  <select value={newCustodianId} onChange={(e) => setNewCustodianId(e.target.value)}>
                    <option value="">—</option>
                    {(employees ?? []).map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
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
