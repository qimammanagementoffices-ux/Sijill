"use client";

import { useEntityLocale } from "@/i18n/entityName";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { usePermissions } from "@/lib/session";
import { getToken } from "@/lib/auth";
import { exportToXlsx } from "@/lib/exportXlsx";
import { fetchAllPaged } from "@/lib/fetchAllPaged";
import PrintReportHeader from "@/components/PrintReportHeader";
import SectionLoading from "@/components/SectionLoading";
import Toast from "@/components/Toast";
import TrilingualNameFields from "@/components/TrilingualNameFields";
import TableFooter from "@/components/TableFooter";
import TableSearch from "@/components/TableSearch";
import { IconTrash } from "@/components/NavIcons";
import ExportButton from "@/components/ExportButton";
import { flattenDepartmentHierarchy } from "@/components/DepartmentHierarchyPicker";
import type { EmployeeOption, LocalizedEntityDto, PagedResponse, RoomDto } from "@/lib/types";
import { withCount } from "@/lib/withCount";
import type { Dictionary } from "@/i18n/getDictionary";

type Edited = {
  roomNumber: string;
  nameAr: string;
  nameEn: string;
  nameHi: string;
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
  // From AppShell's /auth/me, not a second call of our own.
  const canManage = usePermissions().includes("as.manage");
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newNameAr, setNewNameAr] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [newNameHi, setNewNameHi] = useState("");
  const [newDepartmentId, setNewDepartmentId] = useState("");
  const [newCustodianId, setNewCustodianId] = useState("");
  const [editingRoom, setEditingRoom] = useState<RoomDto | null>(null);
  const [editDraft, setEditDraft] = useState<Edited | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [departments, setDepartments] = useState<LocalizedEntityDto[] | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[] | null>(null);

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
    Promise.all([
      apiFetch<LocalizedEntityDto[]>("/departments"),
      apiFetch<EmployeeOption[]>("/employees/options"),
    ]).then(([d, e]) => {
      setDepartments(d);
      setEmployees(e);
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
          departmentId: newDepartmentId || null,
          custodianId: newCustodianId || null,
          version: null,
        }),
      });
      setNewRoomNumber("");
      setNewNameAr("");
      setNewNameEn("");
      setNewNameHi("");
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

  function openEditModal(room: RoomDto) {
    setEditingRoom(room);
    setEditDraft({
      roomNumber: room.roomNumber,
      nameAr: room.nameAr,
      nameEn: room.nameEn,
      nameHi: room.nameHi ?? "",
      departmentId: room.departmentId ?? "",
      custodianId: room.custodianId ?? "",
    });
    setError(null);
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editingRoom || !editDraft) return;
    setError(null);
    setEditSubmitting(true);
    try {
      await apiFetch(`/rooms/${editingRoom.id}`, {
        method: "PUT",
        body: JSON.stringify({
          roomNumber: editDraft.roomNumber,
          nameAr: editDraft.nameAr,
          nameEn: editDraft.nameEn,
          nameHi: editDraft.nameHi || null,
          departmentId: editDraft.departmentId || null,
          custodianId: editDraft.custodianId || null,
          version: editingRoom.version,
        }),
      });
      setEditingRoom(null);
      setEditDraft(null);
      load(page?.page ?? 0);
      setToast(commonDict.actionSuccess);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!editingRoom || !window.confirm(dict.deleteConfirm)) return;
    setError(null);
    setDeleteSubmitting(true);
    try {
      await apiFetch(`/rooms/${editingRoom.id}`, { method: "DELETE" });
      setEditingRoom(null);
      setEditDraft(null);
      load(0);
      setToast(commonDict.actionSuccess);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setDeleteSubmitting(false);
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
  const departmentOptions = flattenDepartmentHierarchy(departments ?? [], entityLocale)
    .map((row) => ({ ...row, path: row.path.replaceAll(" / ", "/") }));

  return (
    <>
      <div className="no-print">
        <div className="eyebrow">{dict.title}</div>
        <h1 className="section-title disp">{withCount(dict.title, page)}</h1>
      </div>
      <div className="print-only">
        <PrintReportHeader title={dict.title} dict={commonDict} />
      </div>
      {error && (
        <p role="alert" className="form-error form-error-block">
          {error}
        </p>
      )}

      <div className="panel">
        <div className="panel-head table-toolbar no-print">
          <form onSubmit={handleSearch} className="filter-row" style={{ flex: 1 }}>
            <TableSearch value={q} onChange={setQ} placeholder={dict.searchPlaceholder} label={dict.search} />
            <select
              value={departmentFilter}
              onChange={(e) => applyDepartmentFilter(e.target.value)}
            >
              <option value="">{dict.filterAllDepartments}</option>
              {departmentOptions.map(({ item, path }) => (
                <option key={item.id} value={item.id}>
                  {path}
                </option>
              ))}
            </select>
            {filtersActive && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters} aria-label="clear">×</button>
            )}
          </form>
          <div className="table-toolbar-actions">
            <ExportButton format="xlsx" label={commonDict.exportXlsx} onClick={handleExport} />
            <ExportButton format="pdf" label={commonDict.exportPdf} onClick={handlePrint} />
            {canManage && <button type="button" className="btn btn-primary btn-sm" onClick={openAddModal}>{dict.addNew}</button>}
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
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id} className={canManage ? "clickable" : undefined} onClick={() => { if (canManage) openEditModal(room); }}>
                    <td className="mono">{room.roomNumber}</td>
                    <td>{room.nameAr}</td>
                    <td>{room.nameHi || "—"}</td>
                    <td dir="ltr">{room.nameEn}</td>
                    <td>{entityLocale === "en" ? room.departmentNameEn : room.departmentNameAr || "—"}</td>
                    <td>{room.custodianName || "—"}</td>
                    <td><span className="count-badge">{room.assetCount}</span></td>
                  </tr>
                ))}
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
                  <label>{dict.departmentLabel}</label>
                  <select value={newDepartmentId} onChange={(e) => setNewDepartmentId(e.target.value)}>
                    <option value="">—</option>
                    {departmentOptions.map(({ item, path }) => (
                      <option key={item.id} value={item.id}>
                        {path}
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

      {editingRoom && editDraft && (
        <div className="overlay no-print" role="dialog" aria-modal="true">
          <div className="modal wide room-edit-modal">
            <div className="modal-head">
              <h3>{dict.editTitle}</h3>
              <button type="button" className="modal-close" onClick={() => { setEditingRoom(null); setEditDraft(null); }} aria-label="close" disabled={editSubmitting || deleteSubmitting}>×</button>
            </div>
            <div className="modal-body">
              <form id="room-edit-form" onSubmit={handleUpdate} className="form-grid">
                <div className="field">
                  <label>{dict.roomNumberLabel}</label>
                  <input type="text" value={editDraft.roomNumber} onChange={(e) => setEditDraft({ ...editDraft, roomNumber: e.target.value })} required />
                </div>
                <div className="field">
                  <label>{dict.custodianLabel}</label>
                  <select value={editDraft.custodianId} onChange={(e) => setEditDraft({ ...editDraft, custodianId: e.target.value })}>
                    <option value="">—</option>
                    {(employees ?? []).map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>{dict.departmentLabel}</label>
                  <select value={editDraft.departmentId} onChange={(e) => setEditDraft({ ...editDraft, departmentId: e.target.value })}>
                    <option value="">—</option>
                    {departmentOptions.map(({ item, path }) => <option key={item.id} value={item.id}>{path}</option>)}
                  </select>
                </div>
                <div aria-hidden="true" />
                <div className="field span2">
                  <label>{dict.nameArLabel}</label>
                  <input type="text" value={editDraft.nameAr} onChange={(e) => setEditDraft({ ...editDraft, nameAr: e.target.value })} dir="rtl" required />
                </div>
                <div className="field">
                  <label>{dict.nameEnLabel}</label>
                  <input type="text" value={editDraft.nameEn} onChange={(e) => setEditDraft({ ...editDraft, nameEn: e.target.value })} dir="ltr" required />
                </div>
                <div className="field">
                  <label>{dict.nameHiLabel}</label>
                  <input type="text" value={editDraft.nameHi} onChange={(e) => setEditDraft({ ...editDraft, nameHi: e.target.value })} dir="ltr" />
                </div>
              </form>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn room-delete-btn btn-sm" onClick={() => void handleDelete()} disabled={editSubmitting || deleteSubmitting}>{deleteSubmitting && <span className="spinner" />}<IconTrash className="ic-sm" />{dict.delete}</button>
              <span className="room-edit-footer-spacer" />
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setEditingRoom(null); setEditDraft(null); }} disabled={editSubmitting || deleteSubmitting}>{commonDict.cancel}</button>
              <button type="submit" form="room-edit-form" className="btn room-save-btn btn-sm" disabled={editSubmitting || deleteSubmitting}>{editSubmitting && <span className="spinner" />}{dict.saveChanges}{!editSubmitting && <span aria-hidden="true">✓</span>}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
