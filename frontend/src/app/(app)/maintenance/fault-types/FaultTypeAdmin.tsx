"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { CategoryDto, FaultTypeDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";

type Edited = { nameAr: string; nameEn: string; suggestedCategoryId: string };

export default function FaultTypeAdmin({ dict }: { dict: Dictionary["faultTypes"] }) {
  const router = useRouter();
  const [faultTypes, setFaultTypes] = useState<FaultTypeDto[] | null>(null);
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);
  const [newNameAr, setNewNameAr] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [editing, setEditing] = useState<Record<string, Edited>>({});
  const [error, setError] = useState<string | null>(null);

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
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
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

        <div className="panel-body" style={{ borderTop: "1px solid var(--line-soft)" }}>
          <form onSubmit={handleCreate} className="form-grid">
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
            <div className="field span2">
              <button type="submit" className="btn btn-primary btn-sm">
                {dict.addNew}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
