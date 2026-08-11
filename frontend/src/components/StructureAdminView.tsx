"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { LocalizedEntityDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "./SectionLoading";
import Toast from "./Toast";
import TrilingualNameFields from "./TrilingualNameFields";

// Shared by /departments and /job-titles — same CRUD shape (localized
// nameAr/nameEn/nameHi, no delete, version-checked updates) for both.
export default function StructureAdminView({
  dict,
  commonDict,
  categoriesModalDict,
  errorsDict,
  entity,
  title,
}: {
  dict: Dictionary["structure"];
  commonDict: Dictionary["common"];
  categoriesModalDict: Dictionary["categoriesModal"];
  errorsDict: Dictionary["errors"];
  entity: "departments" | "job-titles";
  title: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<LocalizedEntityDto[] | null>(null);
  const [newNameAr, setNewNameAr] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [newNameHi, setNewNameHi] = useState("");
  const [editingItem, setEditingItem] = useState<LocalizedEntityDto | null>(null);
  const [editNameAr, setEditNameAr] = useState("");
  const [editNameEn, setEditNameEn] = useState("");
  const [editNameHi, setEditNameHi] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  function load() {
    apiFetch<LocalizedEntityDto[]>(`/${entity}`)
      .then(setItems)
      .catch(() => router.replace("/dashboard"));
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAddSubmitting(true);
    try {
      await apiFetch(`/${entity}`, {
        method: "POST",
        body: JSON.stringify({ nameAr: newNameAr, nameEn: newNameEn, nameHi: newNameHi || null, version: null }),
      });
      setNewNameAr("");
      setNewNameEn("");
      setNewNameHi("");
      setShowAddModal(false);
      load();
      setToast(commonDict.actionSuccess);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setAddSubmitting(false);
    }
  }

  function openEdit(item: LocalizedEntityDto) {
    setEditingItem(item);
    setEditNameAr(item.nameAr);
    setEditNameEn(item.nameEn);
    setEditNameHi(item.nameHi ?? "");
    setError(null);
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editingItem) return;
    setError(null);
    setEditSubmitting(true);
    try {
      await apiFetch(`/${entity}/${editingItem.id}`, {
        method: "PUT",
        body: JSON.stringify({
          nameAr: editNameAr,
          nameEn: editNameEn,
          nameHi: editNameHi || null,
          version: editingItem.version,
        }),
      });
      setEditingItem(null);
      load();
      setToast(commonDict.actionSuccess);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setEditSubmitting(false);
    }
  }

  if (!items) return <SectionLoading />;

  return (
    <>
      <div className="eyebrow">{title}</div>
      <h1 className="section-title disp">{title}</h1>
      {error && (
        <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </p>
      )}

      <div className="panel">
        <div className="panel-head" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            {dict.addNew}
          </button>
        </div>

        {items.length === 0 ? (
          <div className="empty">
            <b>{dict.nameArLabel}</b>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{dict.nameArLabel}</th>
                  <th>{categoriesModalDict.nameHiLabel}</th>
                  <th>{dict.nameEnLabel}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="clickable" onClick={() => openEdit(item)}>
                    <td>{item.nameAr}</td>
                    <td>{item.nameHi || "—"}</td>
                    <td dir="ltr">{item.nameEn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {showAddModal && (
        <div className="overlay" role="dialog" aria-modal="true">
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
              <form id="structure-add-form" onSubmit={handleCreate} className="form-grid">
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
              </form>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAddModal(false)} disabled={addSubmitting}>
                {commonDict.cancel}
              </button>
              <button type="submit" form="structure-add-form" className="btn btn-primary btn-sm" disabled={addSubmitting}>
                {addSubmitting && <span className="spinner" />}
                {dict.addNew}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-head">
              <h3>{dict.save}</h3>
              <button type="button" className="modal-close" onClick={() => setEditingItem(null)} aria-label="close" disabled={editSubmitting}>×</button>
            </div>
            <div className="modal-body">
              <form id="structure-edit-form" onSubmit={handleUpdate} className="form-grid">
                <TrilingualNameFields
                  nameAr={editNameAr}
                  setNameAr={setEditNameAr}
                  nameEn={editNameEn}
                  setNameEn={setEditNameEn}
                  nameHi={editNameHi}
                  setNameHi={setEditNameHi}
                  dict={categoriesModalDict}
                  errorsDict={errorsDict}
                />
              </form>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingItem(null)} disabled={editSubmitting}>{commonDict.cancel}</button>
              <button type="submit" form="structure-edit-form" className="btn btn-primary btn-sm" disabled={editSubmitting}>
                {editSubmitting && <span className="spinner" />}
                {dict.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
