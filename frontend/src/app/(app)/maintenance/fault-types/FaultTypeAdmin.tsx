"use client";

import { entityName, useEntityLocale } from "@/i18n/entityName";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { CategoryDto, FaultTypeDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";
import Toast from "@/components/Toast";
import TrilingualNameFields from "@/components/TrilingualNameFields";

type Edited = { nameAr: string; nameEn: string; nameHi: string; suggestedCategoryId: string };

export default function FaultTypeAdmin({
  dict,
  commonDict,
  categoriesModalDict,
  errorsDict,
}: {
  dict: Dictionary["faultTypes"];
  commonDict: Dictionary["common"];
  categoriesModalDict: Dictionary["categoriesModal"];
  errorsDict: Dictionary["errors"];
}) {
  const entityLocale = useEntityLocale();
  const router = useRouter();
  const [faultTypes, setFaultTypes] = useState<FaultTypeDto[] | null>(null);
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);
  const [newNameAr, setNewNameAr] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [newNameHi, setNewNameHi] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [editingItem, setEditingItem] = useState<FaultTypeDto | null>(null);
  const [editDraft, setEditDraft] = useState<Edited | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  function load() {
    Promise.all([
      apiFetch<FaultTypeDto[]>("/maintenance/fault-types"),
      apiFetch<CategoryDto[]>("/maintenance/categories"),
    ])
      .then(([f, c]) => {
        setFaultTypes(f);
        setCategories(c);
      })
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
      await apiFetch("/maintenance/fault-types", {
        method: "POST",
        body: JSON.stringify({
          nameAr: newNameAr,
          nameEn: newNameEn,
          nameHi: newNameHi || null,
          suggestedCategoryId: newCategoryId || null,
          version: null,
        }),
      });
      setNewNameAr("");
      setNewNameEn("");
      setNewNameHi("");
      setNewCategoryId("");
      setShowAddModal(false);
      load();
      setToast(commonDict.actionSuccess);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setAddSubmitting(false);
    }
  }

  function openEdit(faultType: FaultTypeDto) {
    setEditingItem(faultType);
    setEditDraft({
      nameAr: faultType.nameAr,
      nameEn: faultType.nameEn,
      nameHi: faultType.nameHi ?? "",
      suggestedCategoryId: faultType.suggestedCategory?.id ?? "",
    });
    setError(null);
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editingItem || !editDraft) return;
    setError(null);
    setEditSubmitting(true);
    try {
      await apiFetch(`/maintenance/fault-types/${editingItem.id}`, {
        method: "PUT",
        body: JSON.stringify({
          nameAr: editDraft.nameAr,
          nameEn: editDraft.nameEn,
          nameHi: editDraft.nameHi || null,
          suggestedCategoryId: editDraft.suggestedCategoryId || null,
          version: editingItem.version,
        }),
      });
      setEditingItem(null);
      setEditDraft(null);
      load();
      setToast(commonDict.actionSuccess);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setEditSubmitting(false);
    }
  }

  if (!faultTypes || !categories) return <SectionLoading />;

  return (
    <>
      <div className="eyebrow">{dict.title}</div>
      <h1 className="section-title disp">{dict.title}</h1>
      {error && (
        <p role="alert" className="form-error form-error-block">
          {error}
        </p>
      )}

      <div className="panel">
        <div className="panel-head panel-head-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            {dict.addNew}
          </button>
        </div>

        {faultTypes.length === 0 ? (
          <div className="empty">
            <b>{dict.title}</b>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{dict.nameArLabel}</th>
                  <th>{dict.nameHiLabel}</th>
                  <th>{dict.nameEnLabel}</th>
                  <th>{dict.suggestedCategoryLabel}</th>
                </tr>
              </thead>
              <tbody>
                {faultTypes.map((faultType) => (
                  <tr key={faultType.id} className="clickable" onClick={() => openEdit(faultType)}>
                    <td>{faultType.nameAr}</td>
                    <td>{faultType.nameHi || "—"}</td>
                    <td dir="ltr">{faultType.nameEn}</td>
                    <td>{faultType.suggestedCategory ? (entityLocale === "en" ? faultType.suggestedCategory.en : faultType.suggestedCategory.ar) : "—"}</td>
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
              <form id="fault-type-add-form" onSubmit={handleCreate} className="form-grid">
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
                <div className="field span2">
                  <label>{dict.suggestedCategoryLabel}</label>
                  <select value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)}>
                    <option value="">—</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {entityName(c, entityLocale)}
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
              <button type="submit" form="fault-type-add-form" className="btn btn-primary btn-sm" disabled={addSubmitting}>
                {addSubmitting && <span className="spinner" />}
                {dict.addNew}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingItem && editDraft && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-head">
              <h3>{dict.save}</h3>
              <button type="button" className="modal-close" onClick={() => { setEditingItem(null); setEditDraft(null); }} aria-label="close" disabled={editSubmitting}>×</button>
            </div>
            <div className="modal-body">
              <form id="fault-type-edit-form" onSubmit={handleUpdate} className="form-grid">
                <TrilingualNameFields
                  nameAr={editDraft.nameAr}
                  setNameAr={(value) => setEditDraft({ ...editDraft, nameAr: value })}
                  nameEn={editDraft.nameEn}
                  setNameEn={(value) => setEditDraft({ ...editDraft, nameEn: value })}
                  nameHi={editDraft.nameHi}
                  setNameHi={(value) => setEditDraft({ ...editDraft, nameHi: value })}
                  dict={categoriesModalDict}
                  errorsDict={errorsDict}
                />
                <div className="field span2">
                  <label>{dict.suggestedCategoryLabel}</label>
                  <select value={editDraft.suggestedCategoryId} onChange={(e) => setEditDraft({ ...editDraft, suggestedCategoryId: e.target.value })}>
                    <option value="">—</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{entityName(category, entityLocale)}</option>)}
                  </select>
                </div>
              </form>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setEditingItem(null); setEditDraft(null); }} disabled={editSubmitting}>{commonDict.cancel}</button>
              <button type="submit" form="fault-type-edit-form" className="btn btn-primary btn-sm" disabled={editSubmitting}>{editSubmitting && <span className="spinner" />}{dict.save}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
