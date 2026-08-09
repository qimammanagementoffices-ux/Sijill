"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { CategoryDto, FaultTypeDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";
import Toast from "@/components/Toast";

type Edited = { nameAr: string; nameEn: string; suggestedCategoryId: string };

export default function FaultTypeAdmin({
  dict,
  commonDict,
}: {
  dict: Dictionary["faultTypes"];
  commonDict: Dictionary["common"];
}) {
  const router = useRouter();
  const [faultTypes, setFaultTypes] = useState<FaultTypeDto[] | null>(null);
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);
  const [newNameAr, setNewNameAr] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [editing, setEditing] = useState<Record<string, Edited>>({});
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);

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
          suggestedCategoryId: newCategoryId || null,
          version: null,
        }),
      });
      setNewNameAr("");
      setNewNameEn("");
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

  async function handleUpdate(faultType: FaultTypeDto) {
    const edited = editing[faultType.id];
    if (!edited) return;
    setError(null);
    try {
      await apiFetch(`/maintenance/fault-types/${faultType.id}`, {
        method: "PUT",
        body: JSON.stringify({
          nameAr: edited.nameAr,
          nameEn: edited.nameEn,
          suggestedCategoryId: edited.suggestedCategoryId || null,
          version: faultType.version,
        }),
      });
      load();
      setToast(commonDict.actionSuccess);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  if (!faultTypes || !categories) return <SectionLoading />;

  return (
    <>
      <div className="eyebrow">{dict.title}</div>
      <h1 className="section-title disp">{dict.title}</h1>
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
                  <th>{dict.nameEnLabel}</th>
                  <th>{dict.suggestedCategoryLabel}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {faultTypes.map((faultType) => {
                  const edited = editing[faultType.id] ?? {
                    nameAr: faultType.nameAr,
                    nameEn: faultType.nameEn,
                    suggestedCategoryId: faultType.suggestedCategory?.id ?? "",
                  };
                  return (
                    <tr key={faultType.id}>
                      <td>
                        <input
                          type="text"
                          value={edited.nameAr}
                          onChange={(e) =>
                            setEditing({ ...editing, [faultType.id]: { ...edited, nameAr: e.target.value } })
                          }
                          style={{ border: "1.5px solid var(--line)", borderRadius: 8, padding: "6px 9px", width: "100%" }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={edited.nameEn}
                          onChange={(e) =>
                            setEditing({ ...editing, [faultType.id]: { ...edited, nameEn: e.target.value } })
                          }
                          style={{ border: "1.5px solid var(--line)", borderRadius: 8, padding: "6px 9px", width: "100%" }}
                        />
                      </td>
                      <td>
                        <select
                          value={edited.suggestedCategoryId}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              [faultType.id]: { ...edited, suggestedCategoryId: e.target.value },
                            })
                          }
                        >
                          <option value="">—</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nameAr} / {c.nameEn}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => handleUpdate(faultType)}>
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
              <form id="fault-type-add-form" onSubmit={handleCreate} className="form-grid">
                <div className="field">
                  <label>{dict.nameArLabel}</label>
                  <input type="text" value={newNameAr} onChange={(e) => setNewNameAr(e.target.value)} required />
                </div>
                <div className="field">
                  <label>{dict.nameEnLabel}</label>
                  <input type="text" value={newNameEn} onChange={(e) => setNewNameEn(e.target.value)} required />
                </div>
                <div className="field span2">
                  <label>{dict.suggestedCategoryLabel}</label>
                  <select value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)}>
                    <option value="">—</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameAr} / {c.nameEn}
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

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
