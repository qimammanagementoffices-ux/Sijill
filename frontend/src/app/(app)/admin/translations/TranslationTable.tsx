"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { PagedResponse, TranslationRow } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

type Edited = { valueAr: string; valueEn: string; valueHi: string };

export default function TranslationTable({ dict }: { dict: Dictionary["adminTranslations"] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [page, setPage] = useState<PagedResponse<TranslationRow> | null>(null);
  const [edits, setEdits] = useState<Record<string, Edited>>({});
  const [error, setError] = useState<string | null>(null);
  const [conflictKeys, setConflictKeys] = useState<Set<string>>(new Set());

  function load(pageNumber: number, query: string) {
    apiFetch<PagedResponse<TranslationRow>>(
      `/i18n/translations?q=${encodeURIComponent(query)}&page=${pageNumber}`
    )
      .then(setPage)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.replace("/dashboard");
        }
      });
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load(0, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    load(0, q);
  }

  async function handleSave(row: TranslationRow) {
    const edited = edits[row.key];
    if (!edited) return;
    setError(null);
    try {
      await apiFetch(`/i18n/translations/${encodeURIComponent(row.key)}`, {
        method: "PUT",
        body: JSON.stringify({
          valueAr: edited.valueAr,
          valueEn: edited.valueEn,
          valueHi: edited.valueHi || null,
          version: row.version,
        }),
      });
      setConflictKeys((prev) => {
        const next = new Set(prev);
        next.delete(row.key);
        return next;
      });
      load(page?.page ?? 0, q);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConflictKeys((prev) => new Set(prev).add(row.key));
      } else {
        setError(err instanceof ApiError ? err.message : String(err));
      }
    }
  }

  if (!page) return null;

  return (
    <main style={{ maxWidth: 1000, margin: "5vh auto", padding: "0 1rem" }}>
      <h1>{dict.title}</h1>
      {error && <p role="alert">{error}</p>}

      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={dict.searchPlaceholder}
        />
        <button type="submit">{dict.search}</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>{dict.columnKey}</th>
            <th>{dict.columnEn}</th>
            <th>{dict.columnAr}</th>
            <th>{dict.columnHi}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {page.content.map((row) => {
            const edited = edits[row.key] ?? {
              valueAr: row.valueAr,
              valueEn: row.valueEn,
              valueHi: row.valueHi ?? "",
            };
            return (
              <tr key={row.key}>
                <td>
                  <code>{row.key}</code>
                  {conflictKeys.has(row.key) && <p role="alert">{dict.conflictNotice}</p>}
                </td>
                <td>
                  <input
                    type="text"
                    value={edited.valueEn}
                    onChange={(e) =>
                      setEdits({ ...edits, [row.key]: { ...edited, valueEn: e.target.value } })
                    }
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={edited.valueAr}
                    onChange={(e) =>
                      setEdits({ ...edits, [row.key]: { ...edited, valueAr: e.target.value } })
                    }
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={edited.valueHi}
                    onChange={(e) =>
                      setEdits({ ...edits, [row.key]: { ...edited, valueHi: e.target.value } })
                    }
                  />
                </td>
                <td>
                  <button type="button" onClick={() => handleSave(row)}>
                    {dict.save}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {page.totalPages > 1 && (
        <p>
          {Array.from({ length: page.totalPages }, (_, i) => i).map((i) => (
            <button key={i} type="button" onClick={() => load(i, q)} disabled={i === page.page}>
              {i + 1}
            </button>
          ))}
        </p>
      )}
    </main>
  );
}
