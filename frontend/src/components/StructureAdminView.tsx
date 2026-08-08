"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { LocalizedEntityDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "./SectionLoading";
import Toast from "./Toast";

// Shared by /departments, /job-titles, /warehouse/categories,
// /maintenance/categories, /assets/categories — same CRUD shape (localized
// nameAr/nameEn, no delete, version-checked updates) for all five.
export default function StructureAdminView({
  dict,
  commonDict,
  entity,
  title,
}: {
  dict: Dictionary["structure"];
  commonDict: Dictionary["common"];
  entity: "departments" | "job-titles" | "warehouse/categories" | "maintenance/categories" | "assets/categories";
  title: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<LocalizedEntityDto[] | null>(null);
  const [newNameAr, setNewNameAr] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [editing, setEditing] = useState<Record<string, { nameAr: string; nameEn: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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
    try {
      await apiFetch(`/${entity}`, {
        method: "POST",
        body: JSON.stringify({ nameAr: newNameAr, nameEn: newNameEn, version: null }),
      });
      setNewNameAr("");
      setNewNameEn("");
      load();
      setToast(commonDict.actionSuccess);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  async function handleUpdate(item: LocalizedEntityDto) {
    const edited = editing[item.id];
    if (!edited) return;
    setError(null);
    try {
      await apiFetch(`/${entity}/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ nameAr: edited.nameAr, nameEn: edited.nameEn, version: item.version }),
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
                  <th>{dict.nameEnLabel}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const edited = editing[item.id] ?? { nameAr: item.nameAr, nameEn: item.nameEn };
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

        <div className="panel-body" style={{ borderTop: "1px solid var(--line-soft)" }}>
          <h3 style={{ marginTop: 0 }}>{dict.addNew}</h3>
          <form onSubmit={handleCreate} className="form-grid">
            <div className="field">
              <label>{dict.nameArLabel}</label>
              <input
                type="text"
                value={newNameAr}
                onChange={(e) => setNewNameAr(e.target.value)}
                placeholder={dict.nameArLabel}
                dir="rtl"
                required
              />
            </div>
            <div className="field">
              <label>{dict.nameEnLabel}</label>
              <input
                type="text"
                value={newNameEn}
                onChange={(e) => setNewNameEn(e.target.value)}
                placeholder={dict.nameEnLabel}
                dir="ltr"
                required
              />
            </div>
            <div className="field span2">
              <button type="submit" className="btn btn-primary btn-sm">
                {dict.addNew}
              </button>
            </div>
          </form>
        </div>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
