"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { LocalizedEntityDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

// Shared by /departments and /job-titles — same CRUD shape (localized
// nameAr/nameEn, no delete, version-checked updates) for both entities.
export default function StructureAdminView({
  dict,
  entity,
  title,
}: {
  dict: Dictionary["structure"];
  entity: "departments" | "job-titles" | "warehouse/categories" | "maintenance/categories";
  title: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<LocalizedEntityDto[] | null>(null);
  const [newNameAr, setNewNameAr] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [editing, setEditing] = useState<Record<string, { nameAr: string; nameEn: string }>>({});
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  if (!items) return null;

  return (
    <main style={{ maxWidth: 600, margin: "5vh auto", padding: "0 1rem" }}>
      <h1>{title}</h1>
      {error && <p role="alert">{error}</p>}

      <ul>
        {items.map((item) => {
          const edited = editing[item.id] ?? { nameAr: item.nameAr, nameEn: item.nameEn };
          return (
            <li key={item.id}>
              <input
                type="text"
                value={edited.nameAr}
                onChange={(e) =>
                  setEditing({ ...editing, [item.id]: { ...edited, nameAr: e.target.value } })
                }
              />
              <input
                type="text"
                value={edited.nameEn}
                onChange={(e) =>
                  setEditing({ ...editing, [item.id]: { ...edited, nameEn: e.target.value } })
                }
              />
              <button type="button" onClick={() => handleUpdate(item)}>
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
        <button type="submit">{dict.addNew}</button>
      </form>
    </main>
  );
}
