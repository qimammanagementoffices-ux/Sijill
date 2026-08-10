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
  const [editing, setEditing] = useState<Record<string, { nameAr: string; nameEn: string; nameHi: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);

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

  async function handleUpdate(item: LocalizedEntityDto) {
    const edited = editing[item.id];
    if (!edited) return;
    setError(null);
    try {
      await apiFetch(`/${entity}/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({
          nameAr: edited.nameAr,
          nameEn: edited.nameEn,
          nameHi: edited.nameHi || null,
          version: item.version,
        }),
      });
      load();
      setToast(commonDict.actionSuccess);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const edited = editing[item.id] ?? { nameAr: item.nameAr, nameEn: item.nameEn, nameHi: item.nameHi ?? "" };
                  return (
                    <tr key={item.id}>
                      <td>
                        <input
                          type="text"
                          value={edited.nameAr}
                          onChange={(e) => setEditing({ ...editing, [item.id]: { ...edited, nameAr: e.target.value } })}
                          style={{ border: "1.5px solid var(--line)", borderRadius: 8, padding: "6px 9px", width: "100%" }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={edited.nameHi}
                          onChange={(e) => setEditing({ ...editing, [item.id]: { ...edited, nameHi: e.target.value } })}
                          style={{ border: "1.5px solid var(--line)", borderRadius: 8, padding: "6px 9px", width: "100%" }}
                          dir="rtl"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={edited.nameEn}
                          onChange={(e) => setEditing({ ...editing, [item.id]: { ...edited, nameEn: e.target.value } })}
                          style={{ border: "1.5px solid var(--line)", borderRadius: 8, padding: "6px 9px", width: "100%" }}
                        />
                      </td>
                      <td>
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => handleUpdate(item)}>
                          {dict.save}
                        </button>
                      </td>
                    </tr>
                  );
                })}
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

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
