"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { CategoryDto, FaultTypeDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

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

  if (!faultTypes || !categories) return null;

  return (
    <main style={{ maxWidth: 700, margin: "5vh auto", padding: "0 1rem" }}>
      <h1>{dict.title}</h1>
      {error && <p role="alert">{error}</p>}

      <ul>
        {faultTypes.map((faultType) => {
          const edited = editing[faultType.id] ?? {
            nameAr: faultType.nameAr,
            nameEn: faultType.nameEn,
            suggestedCategoryId: faultType.suggestedCategory?.id ?? "",
          };
          return (
            <li key={faultType.id}>
              <input
                type="text"
                value={edited.nameAr}
                onChange={(e) =>
                  setEditing({ ...editing, [faultType.id]: { ...edited, nameAr: e.target.value } })
                }
              />
              <input
                type="text"
                value={edited.nameEn}
                onChange={(e) =>
                  setEditing({ ...editing, [faultType.id]: { ...edited, nameEn: e.target.value } })
                }
              />
              <select
                value={edited.suggestedCategoryId}
                onChange={(e) =>
                  setEditing({ ...editing, [faultType.id]: { ...edited, suggestedCategoryId: e.target.value } })
                }
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr} / {c.nameEn}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => handleUpdate(faultType)}>
                {dict.save}
              </button>
            </li>
          );
        })}
      </ul>

      <form onSubmit={handleCreate}>
        <label>
          {dict.nameArLabel}
          <input type="text" value={newNameAr} onChange={(e) => setNewNameAr(e.target.value)} required />
        </label>
        <label>
          {dict.nameEnLabel}
          <input type="text" value={newNameEn} onChange={(e) => setNewNameEn(e.target.value)} required />
        </label>
        <label>
          {dict.suggestedCategoryLabel}
          <select value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)}>
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameAr} / {c.nameEn}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">{dict.addNew}</button>
      </form>
    </main>
  );
}
